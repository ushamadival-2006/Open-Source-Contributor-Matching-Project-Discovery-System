-- ===== Person 2: PROJECT, PROJECT_SKILL, CATEGORY, ISSUE, CONTRIBUTION =====
CREATE TABLE IF NOT EXISTS category (
    category_id  SERIAL PRIMARY KEY,
    name         VARCHAR(80) NOT NULL UNIQUE,
    description  TEXT
);

CREATE TABLE IF NOT EXISTS project (
    project_id          SERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    description         TEXT NOT NULL DEFAULT '',
    repo_url            VARCHAR(300),
    category_id         INT REFERENCES category(category_id) ON DELETE SET NULL,
    difficulty          VARCHAR(12) NOT NULL DEFAULT 'beginner'
                        CHECK (difficulty IN ('beginner','intermediate','advanced')),
    status              VARCHAR(12) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','archived')),
    stars               INT NOT NULL DEFAULT 0 CHECK (stars >= 0),
    embedding_stale     BOOLEAN NOT NULL DEFAULT TRUE,
    embedding_synced_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_vector       tsvector GENERATED ALWAYS AS
        (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED
);

CREATE TABLE IF NOT EXISTS project_skill (
    project_id  INT NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    skill_id    INT NOT NULL REFERENCES skill(skill_id)     ON DELETE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);

CREATE TABLE IF NOT EXISTS issue (
    issue_id    SERIAL PRIMARY KEY,
    project_id  INT NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    title       VARCHAR(250) NOT NULL,
    description TEXT,
    label       VARCHAR(40) DEFAULT 'general',
    status      VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS contribution (
    contribution_id SERIAL PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    issue_id        INT REFERENCES issue(issue_id) ON DELETE SET NULL,
    developer_id    INT NOT NULL REFERENCES users(user_id),
    type            VARCHAR(12) NOT NULL DEFAULT 'code' CHECK (type IN ('code','docs','review','bug_report')),
    status          VARCHAR(12) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','merged','rejected')),
    lines_changed   INT NOT NULL DEFAULT 0 CHECK (lines_changed >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Indexes (project search & filtering) =====
CREATE INDEX IF NOT EXISTS idx_project_search      ON project USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_project_category    ON project (category_id);
CREATE INDEX IF NOT EXISTS idx_project_filter      ON project (status, difficulty);
CREATE INDEX IF NOT EXISTS idx_project_stale       ON project (project_id) WHERE embedding_stale;
CREATE INDEX IF NOT EXISTS idx_project_skill_skill ON project_skill (skill_id);
CREATE INDEX IF NOT EXISTS idx_issue_project_stat  ON issue (project_id, status);
CREATE INDEX IF NOT EXISTS idx_contrib_project     ON contribution (project_id, status);
CREATE INDEX IF NOT EXISTS idx_contrib_developer   ON contribution (developer_id);
