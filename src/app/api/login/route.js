import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, authConfigured, checkCredentials, createSessionToken } from "@/lib/session";

// POST { username, password } -> sets the session cookie when they match AUTH_USERNAME / AUTH_PASSWORD
export async function POST(request) {
  if (!authConfigured()) {
    return Response.json({ error: "Sign-in isn't set up on the server yet." }, { status: 500 });
  }

  const { username = "", password = "" } = await request.json().catch(() => ({}));
  if (!checkCredentials(username.trim(), password)) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // slow down guessing
    return Response.json({ error: "Wrong username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

// DELETE -> signs out
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
