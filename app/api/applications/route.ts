import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { getSession } from "../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const result = await pool.query(
    `SELECT a.application_id, a.status, a.applied_at, p.project_id, p.title, p.description, p.difficulty
     FROM applications a JOIN projects p ON p.project_id = a.project_id
     WHERE a.developer_id = $1 ORDER BY a.applied_at DESC`,
    [session.developerId]
  );
  return NextResponse.json({ applications: result.rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.developerId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  let body: { project_id?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!Number.isInteger(body.project_id) || !body.project_id || body.project_id < 1) {
    return NextResponse.json({ error: "A valid project_id is required." }, { status: 400 });
  }
  try {
    const result = await pool.query(
      `INSERT INTO applications (developer_id, project_id) VALUES ($1, $2)
       RETURNING application_id, developer_id, project_id, status, applied_at`,
      [session.developerId, body.project_id]
    );
    return NextResponse.json({ application: result.rows[0] }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return NextResponse.json({ error: "You have already applied to this project." }, { status: 409 });
    if (code === "23503") return NextResponse.json({ error: "Project not found." }, { status: 404 });
    console.error("Application create failed:", error);
    return NextResponse.json({ error: "Could not submit application." }, { status: 500 });
  }
}
