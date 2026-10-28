# Person 2 — Project & Discovery Module

The original Person 2 implementation is retained under `backend/` and `sql/`. For the combined application, follow the root [`README.md`](README.md) and initialize the database with `database/integrated_schema.sql` plus `database/integrated_seed.sql`.

The integrated schema uses Person 1's plural tables as the canonical relational model and exposes compatibility views for the FastAPI project-discovery endpoints. **Do not run `sql/01_schema.sql` or the old `scripts/init_db.py` version from an earlier archive** against the combined database; the current `scripts/init_db.py` now initializes the integrated schema.

Person 2 features include project CRUD, category CRUD, required-skill relationships, project search/filter/sort, semantic search, project details, issue CRUD, contribution workflow, project analytics, SQL views/functions/triggers/indexes, and API tests. The Next.js app includes project discovery/detail pages and an admin project/category interface. Use a signed-in admin session for project/category/issue writes.
