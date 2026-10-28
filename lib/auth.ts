import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "contributor_session";
function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export type SessionUser = { userId: number; developerId: number | null; name: string; email: string; role: "developer" | "admin" };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "number" || typeof payload.name !== "string" ||
        typeof payload.email !== "string" || (payload.role !== "developer" && payload.role !== "admin")) return null;
    return {
      userId: payload.userId,
      developerId: typeof payload.developerId === "number" ? payload.developerId : null,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch { return null; }
}

export async function requireUser() {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
