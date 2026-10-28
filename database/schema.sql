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
