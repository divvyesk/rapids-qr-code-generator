import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/session";

// Everything sits behind the sign-in page except:
// - /login and /api/login (the sign-in itself)
// - /i, the image save page that people reach by scanning a QR code
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/i"]);

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const signedIn = await isSignedIn(request);

  if (pathname === "/login" && signedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (PUBLIC_PATHS.has(pathname) || signedIn) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Skip build assets (scripts, styles, fonts) and the favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
