"""Qdrant storage for project embeddings. Point id == project_id (shared identifier)."""
import os

from qdrant_client import QdrantClient, models

from .embeddings import DIM

COLLECTION = "projects"
_client = None


def client() -> QdrantClient:
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL", ":memory:")
        _client = QdrantClient(":memory:") if url == ":memory:" else QdrantClient(url=url)
        if not _client.collection_exists(COLLECTION):
            _client.create_collection(
                COLLECTION, vectors_config=models.VectorParams(size=DIM, distance=models.Distance.COSINE))
    return _client


def count() -> int:
    return client().count(COLLECTION).count


def upsert(p: dict, vector: list[float]) -> None:
    payload = {"project_id": p["project_id"], "title": p["title"], "category": p.get("category"),
               "difficulty": p["difficulty"], "status": p["status"],
               "required_skills": p.get("required_skills") or []}
    client().upsert(COLLECTION, points=[models.PointStruct(id=p["project_id"], vector=vector, payload=payload)])


def delete(project_id: int) -> None:
    client().delete(COLLECTION, points_selector=models.PointIdsList(points=[project_id]))


def _filter(difficulty=None, category=None, exclude_id=None):
    must = []
    if difficulty:
        must.append(models.FieldCondition(key="difficulty", match=models.MatchValue(value=difficulty)))
    if category:
        must.append(models.FieldCondition(key="category", match=models.MatchValue(value=category)))
    must.append(models.FieldCondition(key="status", match=models.MatchValue(value="active")))
    must_not = [models.HasIdCondition(has_id=[exclude_id])] if exclude_id else None
    return models.Filter(must=must, must_not=must_not)


def search(vector, limit=10, difficulty=None, category=None, exclude_id=None):
    res = client().query_points(COLLECTION, query=vector, limit=limit, with_payload=True,
                                query_filter=_filter(difficulty, category, exclude_id))
    return [{"project_id": int(h.id), "score": round(h.score, 4)} for h in res.points]


def similar(project_id: int, limit=5):
    pts = client().retrieve(COLLECTION, ids=[project_id], with_vectors=True)
    if not pts:
        return None
    return search(pts[0].vector, limit=limit, exclude_id=project_id)
