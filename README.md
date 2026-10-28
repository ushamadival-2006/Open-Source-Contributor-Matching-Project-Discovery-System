# Open Source Contributor Matching & Project Discovery System

A two-module student project that helps developers find open-source projects matching their skills. The integrated version uses **Next.js + TypeScript** for the main web app, **FastAPI** for project discovery APIs, **PostgreSQL** for relational data, and **Qdrant** for shared project embeddings.

## What is included

- Registration/login, signed HTTP-only session cookie, developer profile, skills and applications.
- Project creation, project listing, text search, difficulty/category/skill filters, project details and issues.
- Skill-overlap recommendations and semantic retrieval using a shared deterministic 384-dimensional embedding implementation in TypeScript and Python.
- Contribution recording with a PostgreSQL transaction; merging a contribution closes its associated issue.
- Project/category/issue administration endpoints, role checks, project analytics, SQL views/functions/triggers and indexes.
- Seed projects, required skills and sample issues.
- Unit/API test files and Docker Compose for the complete local stack.

## Quick start with Docker (recommended)

1. Install Docker Desktop and start it.
2. In the project root, copy `.env.example` to `.env` and set `SESSION_SECRET` to a random secret of at least 32 characters. The fallback in Compose is for local demos only.
3. Start the services:

   ```bash
   docker compose up --build
   ```

4. Open:
   - Web app: http://localhost:3000
   - Project API docs: http://localhost:8000/docs
   - Project discovery: http://localhost:3000/projects
   - Health check: http://localhost:3000/api/health

The database schema and seed data run automatically only when PostgreSQL initializes an **empty** `pgdata` volume. If you changed the schema and need a clean disposable development database, run `docker compose down -v` and then `docker compose up --build`. Warning: `down -v` deletes local database and Qdrant data.

## Local development without Docker

1. Install Node.js 22+, Python 3.11+, PostgreSQL 16 and Qdrant.
2. Create an empty `oss_match` database, then run from the repository root:

   ```bash
   psql -U postgres -d oss_match -f database/integrated_schema.sql
   psql -U postgres -d oss_match -f database/integrated_seed.sql
   ```

3. Copy `.env.example` to `.env.local`, update the database URL and set a random `SESSION_SECRET` (32+ characters).
4. Install and run the web app:

   ```bash
   npm ci
   npm run dev
   ```

5. In a second terminal, install and run the project API:

   ```bash
   cd backend
   python -m venv .venv
   # Windows: .venv\\Scripts\\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

The API's `DATABASE_URL`, `QDRANT_URL`, `SESSION_SECRET` and `FRONTEND_ORIGINS` must match the values used by Next.js. Run the backend command from the `backend` folder. Ensure Qdrant is running at the configured URL.

## Authentication and roles

- Register a user at `/register`; login at `/login`.
- New accounts have the `developer` role.
- Project/category/issue write operations and embedding synchronization require an `admin` session.
- To promote a local demo user, run this SQL after registering:

  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
  ```

  Log out and log in again so the session contains the updated role.
- Contribution creation uses the signed-in user's session; the API does not trust the submitted developer ID.
- Keep `.env.local`, `.env` and real secrets out of Git. The example Docker password is only for local development; change credentials before any shared deployment.

## Semantic search

The TypeScript and Python modules share the same deterministic 384-dimensional hashing embedding algorithm and the Qdrant collection `projects`. It runs without an external API key and is intended as a reproducible coursework baseline, not as a state-of-the-art language model. Start Qdrant, sign in as an admin, then use `POST /api/recommendations/index` (e.g. through the Next.js app/API tooling) or `POST http://localhost:8000/embeddings/sync` while signed in as admin. The normal recommendations endpoint also supports the SQL skill-overlap baseline if Qdrant is unavailable.

## Main routes

| Route | Purpose |
|---|---|
| `/register`, `/login` | Account creation and login |
| `/profile`, `/skills` | Developer profile and skills |
| `/recommendations` | Skill-based and semantic recommendations |
| `/applications` | Project application tracking |
| `/projects` | Project search and discovery |
| `/projects/{id}` | Project details and issues |
| `/admin/projects` | Admin project creation UI |
| `/docs` on port 8000 | Interactive FastAPI API documentation |

## Database coursework

Use `database/integrated_schema.sql` as the **single canonical schema**. It starts with Person 1's plural relational tables and adds compatibility views so Person 2's API can work with the same database. Do **not** run the legacy `sql/01_schema.sql` against this database; it defines conflicting singular tables. `database/advanced.sql` and the `sql/` files remain as original module/coursework reference files, while the integrated schema contains the executable shared views, stored function, triggers and indexes.

## Validation

- Web checks: `npm run lint` and `npm run build`.
- Python syntax check: `python -m compileall backend/app`.
- Backend tests: from the root, activate the backend virtual environment and run `pytest` (tests that need live PostgreSQL/Qdrant require those services to be running).
- Smoke-test registration/login, profile/skills, project search/details, admin project creation, semantic indexing, recommendations, applications, issue workflow, contribution workflow and analytics.

This is a coursework/demo system. Before public deployment, add production-grade rate limiting, CSRF review, stronger admin provisioning, secret rotation, backups, monitoring and deployment-specific security controls.
