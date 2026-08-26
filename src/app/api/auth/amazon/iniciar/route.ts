import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { logError } from "@/lib/log";

const STATE_COOKIE = "amazon_oauth_state";

/** Arranca el login con Amazon: guarda un `state` (CSRF) y redirige a Amazon. */
export async function GET() {
  const clientId = process.env.AMAZON_CLIENT_ID;
  if (!clientId) {
    logError("Falta AMAZON_CLIENT_ID en el servidor.", null);
    return NextResponse.redirect(`${getSiteUrl()}/login?error=amazon`);
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = `${getSiteUrl()}/api/auth/amazon/callback`;

  const url = new URL("https://www.amazon.com/ap/oa");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "profile");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/amazon",
    maxAge: 300,
  });
  return res;
}
