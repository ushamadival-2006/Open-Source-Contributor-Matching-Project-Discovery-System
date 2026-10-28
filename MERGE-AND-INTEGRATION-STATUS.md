# Integration status — unified build

The project now has a canonical shared schema in `database/integrated_schema.sql`. Person 1's plural tables are authoritative; compatibility views expose the singular names expected by Person 2's discovery API. Do not execute the legacy Person 2 schema independently against the same database.

## Integrated changes
- Unified PostgreSQL schema, including project repository/stars fields, embedding freshness, issue labels/closed timestamps, and contribution workflow metadata.
- Shared `projects` Qdrant collection with 384-dimensional deterministic hashing embeddings implemented equivalently in TypeScript and Python.
- FastAPI project/category/issue write endpoints validate the same signed session cookie as Next.js. Administrative writes require the `admin` role; contribution recording derives the developer from the authenticated session.
- Added Next.js project discovery, project detail, and admin project creation pages.
- Added a Dockerfile for each service and Compose startup with schema/seed initialization on a fresh PostgreSQL volume.
- Added integration setup and test instructions in `README.md`.

## Important operational notes
- PostgreSQL init scripts only run when the database volume is empty. Use a fresh volume for the first setup.
- `SESSION_SECRET` must be identical for Next.js and FastAPI; set a random 32+ character secret in `.env` for local use.
- `database/integrated_schema.sql` is the only schema initialization file to use for the combined system. The original `sql/` and `database/schema.sql` files are retained as module/coursework source references.
- Embeddings use a deterministic hashing baseline to avoid requiring paid API keys and to ensure both modules generate compatible vectors. This is a baseline for coursework, not a transformer embedding model.

## Validation status
Static code checks are performed during packaging. A complete runtime claim requires running Docker services, installing dependencies, executing SQL initialization, running Python tests, and running `npm run lint` / `npm run build` on the target machine.
