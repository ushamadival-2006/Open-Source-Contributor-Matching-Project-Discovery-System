import contextlib
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")
except ImportError:
    pass

from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

DSN = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/oss_match")
_pool = None


def pool():
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(1, 10, DSN)
    return _pool


@contextlib.contextmanager
def cursor():
    """One transaction per `with` block: commit on success, rollback on any exception."""
    conn = pool().getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool().putconn(conn)
