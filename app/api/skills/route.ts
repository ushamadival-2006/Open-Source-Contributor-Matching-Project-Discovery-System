import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET() {
  const result = await pool.query("SELECT skill_id, skill_name FROM skills ORDER BY skill_name");
  return NextResponse.json({ skills: result.rows });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  let body: { skills?: Array<{ skill_id: number; proficiency: string }> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!Array.isArray(body.skills) || body.skills.length > 100) {
    return NextResponse.json({ error: "skills must be an array of at most 100 entries." }, { status: 400 });
  }
  for (const skill of body.skills) {
    if (!Number.isInteger(skill.skill_id) || !["beginner", "intermediate", "advanced"].includes(skill.proficiency)) {
      return NextResponse.json({ error: "Each skill needs a valid skill_id and proficiency." }, { status: 400 });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM developer_skills WHERE developer_id = $1", [session.developerId]);
    for (const skill of body.skills) {
      await client.query(
        `INSERT INTO developer_skills (developer_id, skill_id, proficiency) VALUES ($1, $2, $3)`,
        [session.developerId, skill.skill_id, skill.proficiency]
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, count: body.skills.length });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Skills update failed:", error);
    return NextResponse.json({ error: "Could not save skills. Check skill IDs." }, { status: 400 });
  } finally { client.release(); }
}
