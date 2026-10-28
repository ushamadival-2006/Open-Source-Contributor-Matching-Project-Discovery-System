import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "../../../../lib/db";
import { createSession } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const result = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, dp.developer_id
     FROM users u LEFT JOIN developer_profiles dp ON dp.user_id = u.user_id
     WHERE u.email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  await createSession({ userId: user.user_id, developerId: user.developer_id, name: user.name, email: user.email, role: user.role });
  return NextResponse.json({ user: { userId: user.user_id, developerId: user.developer_id, name: user.name, email: user.email, role: user.role } });
}
