-- Shared tables agreed with Person 1 (Developer & Matching module).
-- Person 1 owns users/skill; CREATE IF NOT EXISTS lets Person 2 run standalone.
-- Coordinate any change to these through Git.
CREATE TABLE IF NOT EXISTS users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(200) NOT NULL UNIQUE,
    role        VARCHAR(20)  NOT NULL DEFAULT 'developer' CHECK (role IN ('developer','admin')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill (
    skill_id    SERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_skill_name_lower ON skill (lower(name));
