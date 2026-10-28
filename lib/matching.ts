import { pool } from "./db";

export async function getSkillRecommendations(developerId: number) {
  const result = await pool.query(
    `WITH developer_skill_set AS (
       SELECT skill_id FROM developer_skills WHERE developer_id = $1
     ),
     project_matches AS (
       SELECT p.project_id, p.title, p.description, p.difficulty, c.category_name,
              COUNT(ps.skill_id) FILTER (WHERE dss.skill_id IS NOT NULL)::int AS matched_count,
              COUNT(ps.skill_id)::int AS required_count,
              COALESCE(ARRAY_AGG(s.skill_name ORDER BY s.skill_name)
                FILTER (WHERE dss.skill_id IS NOT NULL), ARRAY[]::text[]) AS matched_skills
       FROM projects p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN project_skills ps ON ps.project_id = p.project_id
       LEFT JOIN skills s ON s.skill_id = ps.skill_id
       LEFT JOIN developer_skill_set dss ON dss.skill_id = ps.skill_id
       WHERE p.status = 'active'
       GROUP BY p.project_id, p.title, p.description, p.difficulty, c.category_name
     )
     SELECT project_id, title, description, difficulty, category_name, matched_skills,
            CASE WHEN required_count = 0 THEN 0
                 ELSE ROUND(100.0 * matched_count / required_count)::int
            END AS match_score
     FROM project_matches
     ORDER BY match_score DESC, title LIMIT 20`,
    [developerId]
  );
  return result.rows;
}
