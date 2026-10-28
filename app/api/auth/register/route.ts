import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!name || name.length > 100 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Provide a name, valid email, and password of 8–128 characters." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'developer') RETURNING user_id, name, email, role",
      [name, email, passwordHash]
    );
    const user = inserted.rows[0];
    const profile = await client.query(
      "INSERT INTO developer_profiles (user_id, bio, experience_level, interests) VALUES ($1, '', 'beginner', '') RETURNING developer_id",
      [user.user_id]
    );
    await client.query("COMMIT");
    await createSession({ userId: user.user_id, developerId: profile.rows[0].developer_id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ user: { ...user, developer_id: profile.rows[0].developer_id } }, { status: 201 });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    const code = (error as { code?: string })?.code;
    if (code === "23505") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  } finally { client.release(); }
}
