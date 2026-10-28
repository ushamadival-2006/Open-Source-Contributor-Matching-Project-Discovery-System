# Setup note

Use the integrated setup in [`README.md`](README.md). The combined project now uses `database/integrated_schema.sql` as the single canonical schema. Do not run the legacy Person 2 `sql/01_schema.sql` against that database because it defines conflicting singular tables.

Recommended startup: `docker compose up --build`. For manual setup, create an empty `oss_match` PostgreSQL database, run `database/integrated_schema.sql` and `database/integrated_seed.sql`, configure the same 32+ character `SESSION_SECRET` for Next.js and FastAPI, then start the web app and backend as described in `README.md`.
