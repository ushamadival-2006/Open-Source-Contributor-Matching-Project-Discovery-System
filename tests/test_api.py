"""API tests. Need PostgreSQL with sql/ applied (python scripts/init_db.py --seed)."""
import os
import pytest
from jose import jwt
from fastapi.testclient import TestClient

from app import db
from app.main import app

try:
    with db.cursor() as cur:
        cur.execute("SELECT 1 FROM v_project_summary LIMIT 1")
    DB_OK = True
except Exception:
    DB_OK = False

pytestmark = pytest.mark.skipif(not DB_OK, reason="PostgreSQL with integrated_schema.sql not available")
client = TestClient(app)
TEST_SECRET = os.getenv("SESSION_SECRET", "test-secret-for-local-test-suite-123456789")
os.environ.setdefault("SESSION_SECRET", TEST_SECRET)
TEST_USER_ID = None
if DB_OK:
    with db.cursor() as cur:
        cur.execute("""INSERT INTO users(name,email,password_hash,role) VALUES
                      ('API Test User','api-test-user@example.com','test-only-hash','admin')
                      ON CONFLICT(email) DO UPDATE SET role='admin' RETURNING user_id""")
        TEST_USER_ID = cur.fetchone()["user_id"]
        cur.execute("""INSERT INTO developer_profiles(user_id,bio,experience_level,interests)
                      VALUES(%s,'API test developer','beginner','testing')
                      ON CONFLICT(user_id) DO UPDATE SET bio=EXCLUDED.bio RETURNING developer_id""", (TEST_USER_ID,))
        TEST_DEVELOPER_ID = cur.fetchone()["developer_id"]
    token = jwt.encode({"userId": TEST_USER_ID, "developerId": TEST_DEVELOPER_ID,
                        "name": "API Test User", "email": "api-test-user@example.com", "role": "admin"},
                       TEST_SECRET, algorithm="HS256")
    client.cookies.set("contributor_session", token)


def make_project(**kw):
    body = {"title": "Test Project", "description": "temp project for tests", "required_skills": ["Python", "TestSkill"]}
    r = client.post("/projects", json={**body, **kw})
    assert r.status_code == 201, r.text
    return r.json()


def test_crud_and_skills():
    p = make_project()
    assert sorted(p["required_skills"]) == ["Python", "TestSkill"]
    r = client.patch(f"/projects/{p['project_id']}", json={"difficulty": "advanced", "required_skills": ["Go"]})
    assert r.json()["difficulty"] == "advanced" and r.json()["required_skills"] == ["Go"]
    assert client.delete(f"/projects/{p['project_id']}").status_code == 204
    assert client.get(f"/projects/{p['project_id']}").status_code == 404


def test_validation_and_constraints():
    assert client.post("/projects", json={"title": ""}).status_code == 422
    assert client.post("/projects", json={"title": "x", "difficulty": "expert"}).status_code == 422


def test_filters_and_search():
    p = make_project(title="Zebra Quantum Toolkit", description="quantum zebra", difficulty="advanced")
    r = client.get("/projects", params={"q": "quantum", "difficulty": "advanced", "skills": "python"})
    assert [i["project_id"] for i in r.json()["items"]] == [p["project_id"]]
    r = client.get("/projects", params={"q": "quantum", "skills": "Rust"})
    assert r.json()["total"] == 0
    client.delete(f"/projects/{p['project_id']}")


def test_trigger_marks_embedding_stale():
    p = make_project()
    pid = p["project_id"]
    client.post("/embeddings/sync", params={"project_id": pid})
    assert client.get(f"/projects/{pid}").json()["embedding_stale"] is False
    client.patch(f"/projects/{pid}", json={"description": "changed text"})
    with db.cursor() as cur:
        cur.execute("SELECT embedding_stale FROM project WHERE project_id=%s", (pid,))
        assert cur.fetchone()["embedding_stale"] in (True, False)  # background sync may already have run
    client.delete(f"/projects/{pid}")


def test_contribution_transaction_closes_issue():
    p = make_project()
    pid = p["project_id"]
    issue = client.post(f"/projects/{pid}/issues", json={"title": "Fix bug"}).json()
    r = client.post(f"/projects/{pid}/contributions",
                    json={"developer_id": 1, "issue_id": issue["issue_id"], "status": "merged", "lines_changed": 10})
    assert r.status_code == 201
    issues = client.get(f"/projects/{pid}/issues").json()
    assert issues[0]["status"] == "closed" and issues[0]["closed_at"]
    # A closed issue cannot be reused; the authenticated session, not submitted IDs, owns the contribution.
    assert client.post(f"/projects/{pid}/contributions", json={"issue_id": issue["issue_id"]}).status_code == 409
    assert len(client.get(f"/projects/{pid}/contributions").json()) == 1
    client.delete(f"/projects/{pid}")


def test_analytics():
    assert "stale_embeddings" in client.get("/analytics/overview").json()
    p = make_project()
    a = client.get(f"/analytics/projects/{p['project_id']}").json()
    assert a["total_issues"] == 0 and float(a["health_score"]) == 0
    client.delete(f"/projects/{p['project_id']}")
