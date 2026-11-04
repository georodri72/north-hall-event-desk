import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function requireUser() {
  const session = await readSession();
  if (!session) return null;
  return session;
}

export function jsonResult(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export function unauthorized() {
  return jsonResult(401, { ok: false, message: "Sign in required." });
}
