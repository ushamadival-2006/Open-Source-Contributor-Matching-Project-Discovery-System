-- Developer profile with user information
SELECT u.name, u.email, dp.bio, dp.experience_level, dp.interests
FROM users u JOIN developer_profiles dp ON dp.user_id = u.user_id;

-- Skills for each developer
SELECT u.name, s.skill_name, ds.proficiency
FROM users u
JOIN developer_profiles dp ON dp.user_id = u.user_id
JOIN developer_skills ds ON ds.developer_id = dp.developer_id
JOIN skills s ON s.skill_id = ds.skill_id
ORDER BY u.name, s.skill_name;

-- Project requirements
SELECT p.title, s.skill_name, ps.importance
FROM projects p
JOIN project_skills ps ON ps.project_id = p.project_id
JOIN skills s ON s.skill_id = ps.skill_id
ORDER BY p.title, ps.importance DESC;

-- Aggregate / HAVING
SELECT u.name, COUNT(ds.skill_id) AS skill_count
FROM users u JOIN developer_profiles dp ON dp.user_id = u.user_id
JOIN developer_skills ds ON ds.developer_id = dp.developer_id
GROUP BY u.user_id, u.name
HAVING COUNT(ds.skill_id) >= 2;

-- Subquery: projects with a skill known by developer 1
SELECT p.project_id, p.title
FROM projects p
WHERE EXISTS (
 SELECT 1 FROM project_skills ps
 JOIN developer_skills ds ON ds.skill_id = ps.skill_id
 WHERE ps.project_id = p.project_id AND ds.developer_id = 1
);

-- Project and open issue count
SELECT p.title, COUNT(i.issue_id) AS open_issues
FROM projects p LEFT JOIN issues i ON i.project_id = p.project_id AND i.status = 'open'
GROUP BY p.project_id, p.title;
