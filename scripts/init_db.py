"""Initialize the integrated shared schema. Usage: python scripts/init_db.py [--seed].
Run against a NEW, empty database; do not run legacy singular-table SQL separately.
"""
import os
import sys
from pathlib import Path

import psycopg2

DSN = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/oss_match")
ROOT = Path(__file__).resolve().parents[1]
schema_file = ROOT / "database" / "integrated_schema.sql"
seed_file = ROOT / "database" / "integrated_seed.sql"

def read_sql(path: Path) -> str:
    # The schema is also usable through psql; remove its psql-only directive for psycopg2.
    return "\n".join(line for line in path.read_text(encoding="utf-8").splitlines()
                     if not line.lstrip().startswith("\\set "))

with psycopg2.connect(DSN) as conn:
    with conn.cursor() as cur:
        print("running integrated_schema.sql")
        cur.execute(read_sql(schema_file))
        if "--seed" in sys.argv:
            print("running integrated_seed.sql")
            cur.execute(read_sql(seed_file))
print("integrated database ready")
