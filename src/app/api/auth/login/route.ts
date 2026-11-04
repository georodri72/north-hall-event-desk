import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Enter an email and password." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Enter an email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const match = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !match) {
    return NextResponse.json({ ok: false, message: "That email and password don't match." }, { status: 401 });
  }

  const token = await signSession({ id: user.id, email: user.email, name: user.name, title: user.title });
  const response = NextResponse.json({
    ok: true,
    user: { name: user.name, email: user.email, title: user.title },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
