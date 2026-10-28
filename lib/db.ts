import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing. Add it to .env.local.");

declare global {
  var pgPool: Pool | undefined;
}

export const pool = global.pgPool ?? new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

if (process.env.NODE_ENV !== "production") global.pgPool = pool;
