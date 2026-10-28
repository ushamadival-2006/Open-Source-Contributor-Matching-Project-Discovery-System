"""Business logic shared by the API routes."""
from . import db, embeddings, vector_store


def set_project_skills(cur, project_id: int, names: list[str]) -> None:
    """Replace a project's required skills (uses the shared SKILL table)."""
    clean = sorted({n.strip() for n in names if n and n.strip()}, key=str.lower)
    cur.execute("DELETE FROM project_skill WHERE project_id = %s", (project_id,))
    for name in clean:
        cur.execute("""INSERT INTO skills (skill_name)
                       SELECT %s WHERE NOT EXISTS (SELECT 1 FROM skills WHERE lower(skill_name)=lower(%s))
                       ON CONFLICT (skill_name) DO NOTHING""", (name, name))
        cur.execute("""INSERT INTO project_skills (project_id, skill_id)
                       SELECT %s, skill_id FROM skills WHERE lower(skill_name) = lower(%s)
                       ON CONFLICT (project_id, skill_id) DO NOTHING""", (project_id, name))


def sync_project(project_id: int) -> bool:
    """Generate the embedding, store it in Qdrant and clear the stale flag."""
    with db.cursor() as cur:
        cur.execute("SELECT * FROM v_project_summary WHERE project_id = %s", (project_id,))
        p = cur.fetchone()
        if not p:
            vector_store.delete(project_id)
            return False
        vector_store.upsert(p, embeddings.embed(embeddings.project_text(p)))
        cur.execute("""UPDATE project SET embedding_stale = FALSE, embedding_synced_at = now()
                       WHERE project_id = %s""", (project_id,))
    return True


def sync_stale() -> int:
    with db.cursor() as cur:
        cur.execute("SELECT project_id FROM project WHERE embedding_stale")
        ids = [r["project_id"] for r in cur.fetchall()]
    return sum(sync_project(i) for i in ids)


def try_sync(project_id: int) -> None:
    try:
        sync_project(project_id)
    except Exception as exc:  # vector store down must not break CRUD
        print(f"[embedding sync failed for {project_id}] {exc}")


def projects_by_ids(ids: list[int]) -> list[dict]:
    if not ids:
        return []
    with db.cursor() as cur:
        cur.execute("SELECT * FROM v_project_summary WHERE project_id = ANY(%s)", (ids,))
        rows = {r["project_id"]: r for r in cur.fetchall()}
    return [rows[i] for i in ids if i in rows]
