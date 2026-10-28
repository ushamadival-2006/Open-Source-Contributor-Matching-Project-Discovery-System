import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { getSkillRecommendations } from "../../../lib/matching";
import { pool } from "../../../lib/db";
import { searchProjects } from "../../../lib/qdrant";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const semantic = request.nextUrl.searchParams.get("semantic") === "true";

  if (semantic && process.env.QDRANT_URL) {
    try {
      const profile = await pool.query(
        `SELECT u.name, dp.bio, dp.interests,
          COALESCE(STRING_AGG(s.skill_name, ', '), '') AS skills
         FROM developer_profiles dp JOIN users u ON u.user_id = dp.user_id
         LEFT JOIN developer_skills ds ON ds.developer_id = dp.developer_id
         LEFT JOIN skills s ON s.skill_id = ds.skill_id
         WHERE dp.developer_id = $1
         GROUP BY u.name, dp.bio, dp.interests`,
        [session.developerId]
      );
      const p = profile.rows[0];
      if (!p) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      const hits = await searchProjects(`${p.bio || ""}\nInterests: ${p.interests || ""}\nSkills: ${p.skills || ""}`);
      return NextResponse.json({ method: "qdrant-semantic", recommendations: hits.map((hit: { score: number; payload: Record<string, unknown> }) => ({
        project_id: hit.payload?.project_id, title: hit.payload?.title, description: hit.payload?.description,
        difficulty: hit.payload?.difficulty, category_name: hit.payload?.category_name,
        similarity_score: Math.round(hit.score * 100)
      })) });
    } catch (error) {
      console.error("Semantic search unavailable; falling back to SQL.", error);
    }
  }

  const recommendations = await getSkillRecommendations(session.developerId);
  return NextResponse.json({
    method: "shared-skill-overlap",
    recommendations,
    note: "Semantic search uses the shared offline 384-dimensional embedding model when Qdrant is running."
  });
}
