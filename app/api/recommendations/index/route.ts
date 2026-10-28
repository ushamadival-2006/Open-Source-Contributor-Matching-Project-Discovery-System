import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";
import { indexProjects } from "../../../../lib/qdrant";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  if (!process.env.QDRANT_URL) {
    return NextResponse.json({ error: "Configure QDRANT_URL first." }, { status: 400 });
  }
  try {
    const result = await pool.query(
      `SELECT p.project_id, p.title, p.description, p.difficulty, c.category_name,
              COALESCE(ARRAY(SELECT s.skill_name FROM project_skills ps JOIN skills s USING(skill_id) WHERE ps.project_id=p.project_id ORDER BY s.skill_name), ARRAY[]::text[]) AS required_skills
       FROM projects p LEFT JOIN categories c ON c.category_id = p.category_id
       WHERE p.status = 'active' ORDER BY p.project_id`
    );
    const count = await indexProjects(result.rows);
    return NextResponse.json({ ok: true, indexed: count });
  } catch (error) {
    console.error("Project indexing failed:", error);
    return NextResponse.json({ error: "Project indexing failed. Check that Qdrant is running and the database schema is initialized." }, { status: 500 });
  }
}
