import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.environ.setdefault("EMBEDDER", "hash")
os.environ.setdefault("QDRANT_URL", ":memory:")
