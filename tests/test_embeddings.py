import math

from app import embeddings, vector_store


def test_embedding_is_normalised_and_deterministic():
    a = embeddings.embed("python nlp document analysis")
    assert len(a) == embeddings.DIM
    assert math.isclose(sum(x * x for x in a), 1.0, rel_tol=1e-6)
    assert a == embeddings.embed("python nlp document analysis")


def test_vector_search_ranks_related_project_first():
    projects = [
        {"project_id": 1, "title": "AI Document Analyzer", "description": "NLP for PDF documents",
         "category": "AI", "difficulty": "beginner", "status": "active", "required_skills": ["Python", "NLP"]},
        {"project_id": 2, "title": "KubeWatch", "description": "Kubernetes cluster dashboard",
         "category": "DevOps", "difficulty": "beginner", "status": "active", "required_skills": ["Go", "Kubernetes"]},
    ]
    for p in projects:
        vector_store.upsert(p, embeddings.embed(embeddings.project_text(p)))
    hits = vector_store.search(embeddings.embed("nlp pdf documents python"), limit=2)
    assert hits[0]["project_id"] == 1
    assert vector_store.similar(1, limit=1)[0]["project_id"] == 2
    vector_store.delete(1)
    assert vector_store.similar(1) is None
