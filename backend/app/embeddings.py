"""Shared deterministic 384-dimensional hashing embeddings used by both modules.
This keeps local development and Qdrant indexing usable without paid API keys.
"""
import hashlib
import math
import re

DIM = 384


def embed(text: str) -> list[float]:
    vec = [0.0] * DIM
    tokens = re.findall(r"[a-z0-9+#.]+", text.lower())
    for token in tokens + [a + " " + b for a, b in zip(tokens, tokens[1:])]:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)
        vec[h % DIM] += 1.0 if (h >> 64) & 1 else -1.0
    norm = math.sqrt(sum(value * value for value in vec)) or 1.0
    return [value / norm for value in vec]


def project_text(project: dict) -> str:
    skills = ", ".join(project.get("required_skills") or [])
    return f"{project['title']}. {project.get('category') or ''}. {project.get('description') or ''} Skills: {skills}"
