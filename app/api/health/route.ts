import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query("SELECT current_database() AS database, NOW() AS server_time");
    return NextResponse.json({ status: "ok", database: "connected", details: result.rows[0] });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error", message: "Check DATABASE_URL and PostgreSQL." }, { status: 500 });
  }
}
