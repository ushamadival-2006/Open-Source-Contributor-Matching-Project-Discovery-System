-- Reference queries for the review (Person 2). Run in psql after seeding.
-- JOIN + GROUP BY + HAVING + ORDER BY: skills required by 2+ projects
SELECT s.name, count(*) AS projects
FROM skill s JOIN project_skill ps USING (skill_id)
GROUP BY s.name HAVING count(*) >= 2 ORDER BY projects DESC, s.name;

-- Aggregates per category
SELECT c.name, count(p.project_id) AS projects, round(avg(p.stars)) AS avg_stars
FROM category c LEFT JOIN project p USING (category_id) GROUP BY c.name ORDER BY projects DESC;

-- Subquery: projects with more open issues than average
SELECT title, open_issues FROM v_project_summary
WHERE open_issues > (SELECT avg(open_issues) FROM v_project_summary);

-- Subquery with IN: projects with at least one merged contribution
SELECT title FROM project WHERE project_id IN (SELECT project_id FROM contribution WHERE status='merged');

-- Views and function
SELECT * FROM v_contribution_summary ORDER BY merged DESC;
SELECT * FROM fn_project_analytics(1);

-- Trigger demonstration: editing the description marks the embedding stale
UPDATE project SET embedding_stale = FALSE WHERE project_id = 1;
UPDATE project SET description = description || ' (updated)' WHERE project_id = 1;
SELECT project_id, embedding_stale FROM project WHERE project_id = 1;   -- true

-- Transaction demonstration (contribution workflow)
BEGIN;
  INSERT INTO contribution (project_id, issue_id, developer_id, type, status, lines_changed)
  VALUES (3, 4, 1, 'code', 'merged', 120);
  UPDATE issue SET status = 'closed' WHERE issue_id = 4;
COMMIT;

-- ALTER / DROP practice
ALTER TABLE project ADD COLUMN license VARCHAR(40);
ALTER TABLE project DROP COLUMN license;
