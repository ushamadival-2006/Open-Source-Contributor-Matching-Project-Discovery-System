import os
from typing import Optional

import psycopg2
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import db, embeddings, service, vector_store
from .schemas import (CategoryIn, ContributionIn, ContributionStatus, IssueIn, IssuePatch,
                      ProjectIn, ProjectPatch)

app = FastAPI(title="Project & Discovery API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(","),
                   allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["*"])
STATIC = os.path.join(os.path.dirname(__file__), "..", "static")


@app.middleware("http")
async def require_signed_session_for_mutations(request: Request, call_next):
    """Validate the same HS256 session cookie issued by Next.js before any write."""
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"} or request.url.path.startswith("/static"):
        return await call_next(request)
    token = request.cookies.get("contributor_session")
    secret = os.getenv("SESSION_SECRET", "")
    if not token or len(secret) < 32:
        return JSONResponse(status_code=401, content={"detail": "Sign in before modifying data."})
    try:
        from jose import jwt
        session = jwt.decode(token, secret, algorithms=["HS256"])
        if not isinstance(session.get("userId"), int) or session.get("role") not in {"developer", "admin"}:
            raise ValueError("Invalid session claims")
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Your session is invalid or expired."})
    path = request.url.path
    admin_write = (path.startswith("/categories") or path == "/projects" or
                   (path.startswith("/projects/") and "/contributions" not in path) or
                   path.startswith("/issues/") or path == "/embeddings/sync" or
                   path.startswith("/contributions/"))
    if admin_write and session.get("role") != "admin":
        return JSONResponse(status_code=403, content={"detail": "Administrator role required."})
    request.state.session = session
    return await call_next(request)


@app.exception_handler(psycopg2.IntegrityError)
async def integrity_handler(_, exc):
    return JSONResponse(status_code=409, content={"detail": str(exc).splitlines()[0]})


@app.on_event("startup")
def startup():
    try:
        if vector_store.count() == 0:  # fresh/in-memory Qdrant: re-embed everything
            with db.cursor() as cur:
                cur.execute("UPDATE project SET embedding_stale = TRUE")
        service.sync_stale()
    except Exception as exc:
        print(f"[startup sync skipped] {exc}")


def one(cur, msg="Not found"):
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, msg)
    return row


# ---------------------------------------------------------------- categories
@app.get("/categories")
def list_categories():
    with db.cursor() as cur:
        cur.execute("""SELECT c.*, count(p.project_id) AS projects FROM category c
                       LEFT JOIN project p USING (category_id) GROUP BY c.category_id ORDER BY c.name""")
        return cur.fetchall()


@app.post("/categories", status_code=201)
def create_category(body: CategoryIn):
    with db.cursor() as cur:
        cur.execute("INSERT INTO category (name, description) VALUES (%s,%s) RETURNING *",
                    (body.name, body.description))
        return cur.fetchone()


@app.put("/categories/{category_id}")
def update_category(category_id: int, body: CategoryIn):
    with db.cursor() as cur:
        cur.execute("UPDATE category SET name=%s, description=%s WHERE category_id=%s RETURNING *",
                    (body.name, body.description, category_id))
        return one(cur)


@app.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM category WHERE category_id=%s RETURNING 1", (category_id,))
        one(cur)


@app.get("/skills")
def list_skills():
    with db.cursor() as cur:
        cur.execute("""SELECT s.skill_id, s.name, count(ps.project_id) AS projects FROM skill s
                       LEFT JOIN project_skill ps USING (skill_id) GROUP BY s.skill_id ORDER BY s.name""")
        return cur.fetchall()


# ------------------------------------------------------------------ projects
SORTS = {"newest": "created_at DESC", "stars": "stars DESC", "issues": "open_issues DESC",
         "title": "title ASC"}


@app.get("/projects")
def search_projects(q: Optional[str] = None, category_id: Optional[int] = None,
                    difficulty: Optional[str] = None, status: Optional[str] = "active",
                    skills: Optional[str] = Query(None, description="comma separated, project must need ALL"),
                    has_open_issues: bool = False, sort: str = "newest",
                    limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    skill_list = [s.strip() for s in (skills or "").split(",") if s.strip()] or None
    if status == "all":
        status = None
    params = {"q": q or None, "cat": category_id, "diff": difficulty, "status": status,
              "skills": skill_list, "limit": limit, "offset": offset}
    where = """
      WHERE (%(q)s::text IS NULL OR v.project_id IN
               (SELECT project_id FROM project WHERE search_vector @@ plainto_tsquery('english', %(q)s)))
        AND (%(cat)s::int  IS NULL OR v.category_id = %(cat)s)
        AND (%(diff)s::text IS NULL OR v.difficulty = %(diff)s)
        AND (%(status)s::text IS NULL OR v.status = %(status)s)
        AND (%(skills)s::text[] IS NULL OR NOT EXISTS (
               SELECT 1 FROM unnest(%(skills)s::text[]) AS req(name) WHERE NOT EXISTS (
                 SELECT 1 FROM project_skill ps JOIN skill s ON s.skill_id = ps.skill_id
                 WHERE ps.project_id = v.project_id AND lower(s.name) = lower(req.name))))
    """ + (" AND v.open_issues > 0" if has_open_issues else "")
    if q and sort == "relevance":
        order = ("(SELECT ts_rank(p.search_vector, plainto_tsquery('english', %(q)s)) "
                 "FROM project p WHERE p.project_id = v.project_id) DESC")
    else:
        order = "v." + SORTS.get(sort, SORTS["newest"])
    with db.cursor() as cur:
        cur.execute(f"SELECT count(*) AS n FROM v_project_summary v {where}", params)
        total = cur.fetchone()["n"]
        cur.execute(f"SELECT v.* FROM v_project_summary v {where} ORDER BY {order} LIMIT %(limit)s OFFSET %(offset)s",
                    params)
        return {"total": total, "items": cur.fetchall()}


@app.get("/search/semantic")
def semantic_search(q: str = Query(min_length=2), limit: int = Query(10, ge=1, le=50),
                    difficulty: Optional[str] = None, category: Optional[str] = None):
    hits = vector_store.search(embeddings.embed(q), limit, difficulty, category)
    scores = {h["project_id"]: h["score"] for h in hits}
    items = service.projects_by_ids(list(scores))
    return {"query": q, "items": [{**p, "score": scores[p["project_id"]]} for p in items]}


@app.post("/projects", status_code=201)
def create_project(body: ProjectIn, bg: BackgroundTasks):
    with db.cursor() as cur:
        cur.execute("""INSERT INTO project (title, description, repo_url, category_id, difficulty, status, stars)
                       VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING project_id""",
                    (body.title, body.description, body.repo_url, body.category_id,
                     body.difficulty, body.status, body.stars))
        pid = cur.fetchone()["project_id"]
        service.set_project_skills(cur, pid, body.required_skills)
    bg.add_task(service.try_sync, pid)
    return get_project(pid)


@app.get("/projects/{project_id}")
def get_project(project_id: int):
    with db.cursor() as cur:
        cur.execute("SELECT * FROM v_project_summary WHERE project_id=%s", (project_id,))
        project = one(cur, "Project not found")
        cur.execute("SELECT * FROM issue WHERE project_id=%s ORDER BY created_at DESC", (project_id,))
        project["issues"] = cur.fetchall()
        return project


@app.patch("/projects/{project_id}")
def update_project(project_id: int, body: ProjectPatch, bg: BackgroundTasks):
    data = body.model_dump(exclude_unset=True)
    skills = data.pop("required_skills", None)
    with db.cursor() as cur:
        if data:
            sets = ", ".join(f"{k} = %({k})s" for k in data)  # keys come from the schema, not the client
            cur.execute(f"UPDATE project SET {sets} WHERE project_id = %(pid)s RETURNING 1",
                        {**data, "pid": project_id})
            one(cur, "Project not found")
        if skills is not None:
            service.set_project_skills(cur, project_id, skills)
    bg.add_task(service.try_sync, project_id)
    return get_project(project_id)


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM project WHERE project_id=%s RETURNING 1", (project_id,))
        one(cur, "Project not found")
    try:
        vector_store.delete(project_id)
    except Exception as exc:
        print(f"[vector delete failed] {exc}")


@app.put("/projects/{project_id}/skills")
def replace_skills(project_id: int, skills: list[str], bg: BackgroundTasks):
    with db.cursor() as cur:
        cur.execute("SELECT 1 FROM project WHERE project_id=%s", (project_id,))
        one(cur, "Project not found")
        service.set_project_skills(cur, project_id, skills)
    bg.add_task(service.try_sync, project_id)
    return get_project(project_id)["required_skills"]


@app.get("/projects/{project_id}/similar")
def similar_projects(project_id: int, limit: int = Query(5, ge=1, le=20)):
    hits = vector_store.similar(project_id, limit)
    if hits is None:
        raise HTTPException(404, "Project has no embedding yet - run POST /embeddings/sync")
    scores = {h["project_id"]: h["score"] for h in hits}
    return [{**p, "score": scores[p["project_id"]]} for p in service.projects_by_ids(list(scores))]


# -------------------------------------------------------------------- issues
@app.get("/projects/{project_id}/issues")
def list_issues(project_id: int, status: Optional[str] = None):
    with db.cursor() as cur:
        cur.execute("""SELECT * FROM issue WHERE project_id=%s AND (%s::text IS NULL OR status=%s)
                       ORDER BY created_at DESC""", (project_id, status, status))
        return cur.fetchall()


@app.post("/projects/{project_id}/issues", status_code=201)
def create_issue(project_id: int, body: IssueIn):
    with db.cursor() as cur:
        cur.execute("""INSERT INTO issue (project_id, title, description, label, status)
                       VALUES (%s,%s,%s,%s,%s) RETURNING *""",
                    (project_id, body.title, body.description, body.label, body.status))
        return cur.fetchone()


@app.patch("/issues/{issue_id}")
def update_issue(issue_id: int, body: IssuePatch):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "Nothing to update")
    sets = ", ".join(f"{k} = %({k})s" for k in data)
    with db.cursor() as cur:
        cur.execute(f"UPDATE issue SET {sets} WHERE issue_id = %(id)s RETURNING *", {**data, "id": issue_id})
        return one(cur, "Issue not found")


@app.delete("/issues/{issue_id}", status_code=204)
def delete_issue(issue_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM issue WHERE issue_id=%s RETURNING 1", (issue_id,))
        one(cur, "Issue not found")


# ------------------------------------------------------------- contributions
@app.post("/projects/{project_id}/contributions", status_code=201)
def record_contribution(project_id: int, body: ContributionIn, request: Request):
    """Transactional workflow: lock project (+issue), insert contribution, close issue if merged.
    Any failure rolls the whole thing back."""
    with db.cursor() as cur:
        cur.execute("SELECT 1 FROM project WHERE project_id=%s FOR UPDATE", (project_id,))
        one(cur, "Project not found")
        if body.issue_id:
            cur.execute("SELECT status FROM issue WHERE issue_id=%s AND project_id=%s FOR UPDATE",
                        (body.issue_id, project_id))
            issue = one(cur, "Issue not found in this project")
            if issue["status"] == "closed":
                raise HTTPException(409, "Issue is already closed")
        # The public API accepts users.user_id; canonical contributions reference developer_profiles.developer_id.
        authenticated_user_id = request.state.session["userId"]
        cur.execute("SELECT developer_id FROM developer_profiles WHERE user_id=%s", (authenticated_user_id,))
        profile = cur.fetchone()
        if not profile:
            raise HTTPException(404, "Developer profile not found for this user")
        cur.execute("""INSERT INTO contributions
                       (project_id, issue_id, developer_id, type, status, lines_changed, description)
                       VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING contribution_id, project_id, issue_id,
                       type, status, lines_changed, created_at""",
                    (project_id, body.issue_id, profile["developer_id"], body.type, body.status,
                     body.lines_changed, f"{body.type} contribution"))
        contribution = cur.fetchone()
        contribution["developer_id"] = authenticated_user_id
        if body.status == "merged" and body.issue_id:
            cur.execute("UPDATE issues SET status='closed' WHERE issue_id=%s", (body.issue_id,))
        return contribution


@app.patch("/contributions/{contribution_id}")
def set_contribution_status(contribution_id: int, body: ContributionStatus):
    with db.cursor() as cur:
        cur.execute("UPDATE contributions SET status=%s WHERE contribution_id=%s RETURNING contribution_id, project_id, issue_id, type, status, lines_changed, created_at",
                    (body.status, contribution_id))
        c = one(cur, "Contribution not found")
        if body.status == "merged" and c["issue_id"]:
            cur.execute("UPDATE issues SET status='closed' WHERE issue_id=%s", (c["issue_id"],))
        return c


@app.get("/projects/{project_id}/contributions")
def list_contributions(project_id: int):
    with db.cursor() as cur:
        cur.execute("""SELECT k.*, u.name AS developer FROM contribution k
                       JOIN users u ON u.user_id = k.developer_id
                       WHERE k.project_id=%s ORDER BY k.created_at DESC""", (project_id,))
        return cur.fetchall()


# ----------------------------------------------------------------- analytics
@app.get("/analytics/overview")
def overview():
    with db.cursor() as cur:
        cur.execute("""SELECT (SELECT count(*) FROM project) AS projects,
                              (SELECT count(*) FROM project WHERE status='active') AS active_projects,
                              (SELECT count(*) FROM issue WHERE status<>'closed') AS open_issues,
                              (SELECT count(*) FROM contribution) AS contributions,
                              (SELECT count(*) FROM project WHERE embedding_stale) AS stale_embeddings""")
        out = cur.fetchone()
        cur.execute("""SELECT COALESCE(c.name,'Uncategorised') AS category, count(*) AS projects
                       FROM project p LEFT JOIN category c USING (category_id)
                       GROUP BY 1 ORDER BY projects DESC""")
        out["by_category"] = cur.fetchall()
        cur.execute("""SELECT difficulty, count(*) AS projects FROM project GROUP BY difficulty ORDER BY 1""")
        out["by_difficulty"] = cur.fetchall()
        cur.execute("""SELECT s.name, count(*) AS projects FROM skill s JOIN project_skill USING (skill_id)
                       GROUP BY s.name HAVING count(*) >= 1 ORDER BY projects DESC, s.name LIMIT 8""")
        out["top_skills"] = cur.fetchall()
        cur.execute("""SELECT * FROM v_contribution_summary ORDER BY merged DESC, total_contributions DESC LIMIT 5""")
        out["top_projects"] = cur.fetchall()
        return out


@app.get("/analytics/projects/{project_id}")
def project_analytics(project_id: int):
    with db.cursor() as cur:
        cur.execute("SELECT 1 FROM project WHERE project_id=%s", (project_id,))
        one(cur, "Project not found")
        cur.execute("SELECT * FROM fn_project_analytics(%s)", (project_id,))
        return cur.fetchone()


# ---------------------------------------------------------------- embeddings
@app.post("/embeddings/sync")
def sync_embeddings(project_id: Optional[int] = None):
    if project_id:
        return {"synced": int(service.sync_project(project_id))}
    return {"synced": service.sync_stale()}


# ------------------------------------------------------------------ frontend
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(os.path.join(STATIC, "index.html"))
