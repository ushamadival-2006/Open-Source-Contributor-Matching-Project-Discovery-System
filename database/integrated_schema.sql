-- Canonical schema for the integrated application. Run on a NEW empty database.
-- Person 1 owns the canonical plural tables; compatibility views below let Person 2's
-- FastAPI discovery module use its existing singular table contract.
\set ON_ERROR_STOP on
-- Full shared schema. Run only on a new, empty database.
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE developer_profiles (
    developer_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bio TEXT,
    experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    interests TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE developer_skills (
    developer_id INTEGER NOT NULL REFERENCES developer_profiles(developer_id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    proficiency VARCHAR(20) NOT NULL DEFAULT 'beginner'
      CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
    PRIMARY KEY (developer_id, skill_id)
);
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner'
      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE project_skills (
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    importance SMALLINT NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
    PRIMARY KEY (project_id, skill_id)
);
CREATE TABLE issues (
    issue_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner'
      CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed'))
);
CREATE TABLE applications (
    application_id SERIAL PRIMARY KEY,
    developer_id INTEGER NOT NULL REFERENCES developer_profiles(developer_id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (developer_id, project_id)
);
CREATE TABLE contributions (
    contribution_id SERIAL PRIMARY KEY,
    developer_id INTEGER NOT NULL REFERENCES developer_profiles(developer_id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE
);


ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repo_url VARCHAR(300);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_stale BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_synced_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS
  (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS label VARCHAR(40) NOT NULL DEFAULT 'general';
ALTER TABLE issues ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES issues(issue_id) ON DELETE SET NULL;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS type VARCHAR(12) NOT NULL DEFAULT 'code' CHECK (type IN ('code','docs','review','bug_report'));
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS status VARCHAR(12) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','merged','rejected'));
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS lines_changed INTEGER NOT NULL DEFAULT 0 CHECK (lines_changed >= 0);
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(status, category_id);
CREATE INDEX IF NOT EXISTS idx_projects_embedding_stale ON projects(project_id) WHERE embedding_stale;
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues(project_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_project_status ON contributions(project_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_developer ON contributions(developer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_lower_name ON skills(lower(skill_name));

-- Simple automatically-updatable compatibility views for the discovery API.
CREATE OR REPLACE VIEW skill AS SELECT skill_id, skill_name AS name FROM skills;
CREATE OR REPLACE VIEW category AS SELECT category_id, category_name AS name, description FROM categories;
CREATE OR REPLACE VIEW project AS
 SELECT project_id, title, description, repo_url, category_id, difficulty, status, stars,
        embedding_stale, embedding_synced_at, created_at, updated_at, search_vector FROM projects;
CREATE OR REPLACE VIEW project_skill AS SELECT project_id, skill_id FROM project_skills;
CREATE OR REPLACE VIEW issue AS SELECT issue_id, project_id, title, description, label, difficulty, status, created_at, closed_at FROM issues;
-- Read-only reporting view: the API writes to canonical contributions after mapping user_id to developer_id.
CREATE OR REPLACE VIEW contribution AS
 SELECT c.contribution_id, c.project_id, c.issue_id, u.user_id AS developer_id,
        c.type, c.status, c.lines_changed, c.created_at
 FROM contributions c JOIN developer_profiles dp ON dp.developer_id=c.developer_id
 JOIN users u ON u.user_id=dp.user_id;

CREATE OR REPLACE VIEW v_project_summary AS
 SELECT p.project_id,p.title,p.description,p.repo_url,p.difficulty,p.status,p.stars,
        p.embedding_stale,p.created_at,p.updated_at,c.category_id,c.category_name AS category,
        COALESCE((SELECT array_agg(s.skill_name::text ORDER BY s.skill_name)
          FROM project_skills ps JOIN skills s USING(skill_id) WHERE ps.project_id=p.project_id),'{}'::text[]) AS required_skills,
        (SELECT count(*) FROM issues i WHERE i.project_id=p.project_id AND i.status <> 'closed') AS open_issues,
        (SELECT count(*) FROM issues i WHERE i.project_id=p.project_id) AS total_issues,
        (SELECT count(*) FROM contributions k WHERE k.project_id=p.project_id) AS contributions
 FROM projects p LEFT JOIN categories c USING(category_id);

CREATE OR REPLACE VIEW v_contribution_summary AS
 SELECT p.project_id,p.title,count(k.contribution_id) AS total_contributions,
        count(DISTINCT k.developer_id) AS contributors,
        count(*) FILTER(WHERE k.status='merged') AS merged,
        count(*) FILTER(WHERE k.status='rejected') AS rejected,
        COALESCE(sum(k.lines_changed) FILTER(WHERE k.status='merged'),0) AS merged_lines
 FROM projects p LEFT JOIN contributions k USING(project_id) GROUP BY p.project_id,p.title;

CREATE OR REPLACE FUNCTION fn_project_analytics(p_project_id INT)
RETURNS TABLE(total_issues BIGINT,open_issues BIGINT,closed_issues BIGINT,resolution_rate NUMERIC,
 contributors BIGINT,merged_contributions BIGINT,health_score NUMERIC) AS $$
DECLARE t BIGINT; c BIGINT; m BIGINT; d BIGINT;
BEGIN
 SELECT count(*),count(*) FILTER(WHERE status='closed') INTO t,c FROM issues WHERE project_id=p_project_id;
 SELECT count(DISTINCT developer_id),count(*) FILTER(WHERE status='merged') INTO d,m FROM contributions WHERE project_id=p_project_id;
 RETURN QUERY SELECT t,t-c,c,CASE WHEN t=0 THEN 0 ELSE round(100.0*c/t,1) END,d,m,
  round(LEAST(100,(CASE WHEN t=0 THEN 0 ELSE 50.0*c/t END)+LEAST(30,d*6)+LEAST(20,m*4)),1);
END $$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION mark_project_embedding_stale() RETURNS trigger AS $$
BEGIN
 IF TG_OP='INSERT' THEN UPDATE projects SET embedding_stale=TRUE,updated_at=now() WHERE project_id=NEW.project_id; RETURN NEW;
 ELSIF TG_OP='DELETE' THEN UPDATE projects SET embedding_stale=TRUE,updated_at=now() WHERE project_id=OLD.project_id; RETURN OLD;
 ELSE
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
   NEW.embedding_stale:=TRUE; NEW.updated_at:=now();
  END IF;
  RETURN NEW;
 END IF;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_project_embedding_stale ON projects;
CREATE TRIGGER trg_project_embedding_stale BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION mark_project_embedding_stale();
DROP TRIGGER IF EXISTS trg_project_skill_embedding_stale ON project_skills;
CREATE TRIGGER trg_project_skill_embedding_stale AFTER INSERT OR DELETE ON project_skills FOR EACH ROW EXECUTE FUNCTION mark_project_embedding_stale();
CREATE OR REPLACE FUNCTION maintain_issue_closed_at() RETURNS trigger AS $$
BEGIN IF NEW.status='closed' AND NEW.closed_at IS NULL THEN NEW.closed_at:=now(); ELSIF NEW.status<>'closed' THEN NEW.closed_at:=NULL; END IF; RETURN NEW; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_issue_closed_at ON issues;
CREATE TRIGGER trg_issue_closed_at BEFORE INSERT OR UPDATE OF status ON issues FOR EACH ROW EXECUTE FUNCTION maintain_issue_closed_at();
