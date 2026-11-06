import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";
import { buildCsp } from "@/lib/security/csp";

const PUBLIC_PREFIXES = ["/login", "/design", "/demo"];

export async function middleware(incoming: NextRequest) {
  // A fresh nonce per request. Next reads it from the request's CSP header and
  // stamps it on its own scripts; nothing else on the page can run.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    supabaseUrl: getSupabaseEnv()?.url,
    dev: process.env.NODE_ENV !== "production",
  });
  const headers = new Headers(incoming.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const request = new NextRequest(incoming, { headers });

  const secure = (res: NextResponse) => {
    res.headers.set("content-security-policy", csp);
    return res;
  };

  const { response, authenticated, configured } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Portfolio visitors arrive at the front door: in the public demo, take them straight in.
  if (configured && !authenticated && pathname === "/" && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const url = request.nextUrl.clone();
    url.pathname = "/demo/owner";
    url.search = "";
    return secure(NextResponse.redirect(url));
  }

  if (configured && !authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return secure(NextResponse.redirect(url));
  }
  return secure(response);
}

export const config = {
  matcher: [
    // Skip static assets and image optimisation files.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
