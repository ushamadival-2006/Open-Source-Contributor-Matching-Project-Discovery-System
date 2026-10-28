import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const result = await pool.query(
    `SELECT dp.developer_id, u.name, u.email, dp.bio, dp.experience_level, dp.interests, dp.updated_at,
      COALESCE(JSON_AGG(JSON_BUILD_OBJECT('skill_id', s.skill_id, 'skill_name', s.skill_name, 'proficiency', ds.proficiency))
      FILTER (WHERE s.skill_id IS NOT NULL), '[]'::json) AS skills
     FROM developer_profiles dp JOIN users u ON u.user_id = dp.user_id
     LEFT JOIN developer_skills ds ON ds.developer_id = dp.developer_id
     LEFT JOIN skills s ON s.skill_id = ds.skill_id
     WHERE dp.developer_id = $1
     GROUP BY dp.developer_id, u.name, u.email, dp.bio, dp.experience_level, dp.interests, dp.updated_at`,
    [session.developerId]
  );
  return NextResponse.json({ profile: result.rows[0] || null });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  let body: { bio?: string; experience_level?: string; interests?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const level = body.experience_level;
  if (level && !["beginner", "intermediate", "advanced"].includes(level)) {
    return NextResponse.json({ error: "Invalid experience level." }, { status: 400 });
  }
  if ((body.bio?.length || 0) > 3000 || (body.interests?.length || 0) > 1000) {
    return NextResponse.json({ error: "Profile text is too long." }, { status: 400 });
  }
  const result = await pool.query(
    `UPDATE developer_profiles SET bio = $1, experience_level = $2, interests = $3, updated_at = NOW()
     WHERE developer_id = $4 RETURNING developer_id, bio, experience_level, interests, updated_at`,
    [body.bio ?? "", level ?? "beginner", body.interests ?? "", session.developerId]
  );
  return NextResponse.json({ profile: result.rows[0] });
}
