CREATE INDEX idx_developer_skills_skill ON developer_skills(skill_id);
CREATE INDEX idx_project_skills_skill ON project_skills(skill_id);
CREATE INDEX idx_projects_status_category ON projects(status, category_id);
CREATE INDEX idx_applications_developer_status ON applications(developer_id, status);
CREATE INDEX idx_issues_project_status ON issues(project_id, status);

CREATE OR REPLACE VIEW project_skill_summary AS
SELECT p.project_id, p.title, p.status, c.category_name,
       COALESCE(STRING_AGG(s.skill_name, ', ' ORDER BY s.skill_name), '') AS required_skills
FROM projects p
LEFT JOIN categories c ON c.category_id = p.category_id
LEFT JOIN project_skills ps ON ps.project_id = p.project_id
LEFT JOIN skills s ON s.skill_id = ps.skill_id
GROUP BY p.project_id, p.title, p.status, c.category_name;

CREATE OR REPLACE FUNCTION matching_skill_count(p_developer_id INTEGER, p_project_id INTEGER)
RETURNS INTEGER LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::INTEGER
  FROM developer_skills ds
  JOIN project_skills ps ON ps.skill_id = ds.skill_id
  JOIN projects p ON p.project_id = ps.project_id
  WHERE ds.developer_id = p_developer_id
    AND ps.project_id = p_project_id AND p.status = 'active';
$$;

CREATE OR REPLACE FUNCTION set_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_updated_at ON developer_profiles;
CREATE TRIGGER trg_profile_updated_at
BEFORE UPDATE ON developer_profiles
FOR EACH ROW EXECUTE FUNCTION set_profile_updated_at();

-- Transaction example for coursework:
-- BEGIN;
-- INSERT INTO applications (developer_id, project_id, status) VALUES (1, 1, 'pending');
-- COMMIT;
