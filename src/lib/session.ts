import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "nh_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  title: string;
};

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET || "north-hall-dev-session-secret-change-for-production";
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ email: user.email, name: user.name, title: user.title })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(sessionSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? "Staff"),
      title: String(payload.title ?? ""),
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
  secure: process.env.NODE_ENV === "production",
};
