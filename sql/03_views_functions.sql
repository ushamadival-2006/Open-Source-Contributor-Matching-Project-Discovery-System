-- View: project listing used by the search API.
CREATE OR REPLACE VIEW v_project_summary AS
SELECT p.project_id, p.title, p.description, p.repo_url, p.difficulty, p.status, p.stars,
       p.embedding_stale, p.created_at, p.updated_at,
       c.category_id, c.name AS category,
       COALESCE((SELECT array_agg(s.name::text ORDER BY s.name)
                 FROM project_skill ps JOIN skill s ON s.skill_id = ps.skill_id
                 WHERE ps.project_id = p.project_id), '{}'::text[]) AS required_skills,
       (SELECT count(*) FROM issue i WHERE i.project_id = p.project_id AND i.status <> 'closed') AS open_issues,
       (SELECT count(*) FROM issue i WHERE i.project_id = p.project_id)                        AS total_issues,
       (SELECT count(*) FROM contribution k WHERE k.project_id = p.project_id)                 AS contributions
FROM project p LEFT JOIN category c ON c.category_id = p.category_id;

-- View: contribution summary per project.
CREATE OR REPLACE VIEW v_contribution_summary AS
SELECT p.project_id, p.title,
       count(k.contribution_id)                                              AS total_contributions,
       count(DISTINCT k.developer_id)                                        AS contributors,
       count(*) FILTER (WHERE k.status = 'merged')                           AS merged,
       count(*) FILTER (WHERE k.status = 'rejected')                         AS rejected,
       COALESCE(sum(k.lines_changed) FILTER (WHERE k.status = 'merged'), 0)  AS merged_lines
FROM project p LEFT JOIN contribution k ON k.project_id = p.project_id
GROUP BY p.project_id, p.title;

-- Stored function: per-project analytics with a simple 0-100 health score.
CREATE OR REPLACE FUNCTION fn_project_analytics(p_project_id INT)
RETURNS TABLE (total_issues BIGINT, open_issues BIGINT, closed_issues BIGINT,
               resolution_rate NUMERIC, contributors BIGINT, merged_contributions BIGINT,
               health_score NUMERIC) AS $$
DECLARE t BIGINT; c BIGINT; m BIGINT; d BIGINT;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE status = 'closed') INTO t, c
      FROM issue WHERE project_id = p_project_id;
    SELECT count(DISTINCT developer_id), count(*) FILTER (WHERE status = 'merged') INTO d, m
      FROM contribution WHERE project_id = p_project_id;
    RETURN QUERY SELECT t, t - c, c,
        CASE WHEN t = 0 THEN 0 ELSE round(100.0 * c / t, 1) END,
        d, m,
        round(LEAST(100, (CASE WHEN t = 0 THEN 0 ELSE 50.0 * c / t END)
                       + LEAST(30, d * 6) + LEAST(20, m * 4)), 1);
END $$ LANGUAGE plpgsql STABLE;
