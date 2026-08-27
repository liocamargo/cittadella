import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { logError } from "@/lib/log";

// firebase-admin requiere runtime Node (no Edge). Sin forzarlo, Vercel puede
// ejecutar este handler en Edge y el módulo muere al importar → 500 HTML.
export const runtime = "nodejs";

const STATE_COOKIE = "amazon_oauth_state";
const TOKEN_COOKIE = "amazon_custom_token";

interface PerfilAmazon {
  user_id: string;
  email?: string;
  name?: string;
}

function irALoginConError(): NextResponse {
  const res = NextResponse.redirect(`${getSiteUrl()}/login?error=amazon`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/** Vuelve del login con Amazon: intercambia el code, arma/busca el usuario y deja un custom token. */
export async function GET(request: NextRequest) {
  const clientId = process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logError("Faltan AMAZON_CLIENT_ID/AMAZON_CLIENT_SECRET en el servidor.", null);
    return irALoginConError();
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorAmazon = searchParams.get("error");
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value;

  if (errorAmazon || !code || !state || !stateCookie || state !== stateCookie) {
    if (errorAmazon) logError("Login con Amazon cancelado o rechazado:", errorAmazon);
    else logError("state de Amazon inválido o ausente.", null);
    return irALoginConError();
  }

  const redirectUri = `${getSiteUrl()}/api/auth/amazon/callback`;

  try {
    const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      logError("Error intercambiando el code de Amazon:", await tokenRes.text());
      return irALoginConError();
    }
    const { access_token: accessToken } = await tokenRes.json();

    const perfilRes = await fetch("https://api.amazon.com/user/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!perfilRes.ok) {
      logError("Error consultando el perfil de Amazon:", await perfilRes.text());
      return irALoginConError();
    }
    const perfil: PerfilAmazon = await perfilRes.json();
    if (!perfil.email) {
      logError("El perfil de Amazon no trajo email.", null);
      return irALoginConError();
    }

    const adminAuth = getAdminAuth();
    let uid: string;
    try {
      uid = (await adminAuth.getUserByEmail(perfil.email)).uid;
    } catch (err) {
      const errCode = (err as { code?: string })?.code;
      if (errCode !== "auth/user-not-found") throw err;
      uid = (
        await adminAuth.createUser({
          email: perfil.email,
          emailVerified: true,
          displayName: perfil.name,
        })
      ).uid;
    }

    const customToken = await adminAuth.createCustomToken(uid);

    const res = NextResponse.redirect(`${getSiteUrl()}/login?provider=amazon`);
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(TOKEN_COOKIE, customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/amazon",
      maxAge: 60,
    });
    return res;
  } catch (err) {
    logError("Error inesperado en el callback de Amazon:", err);
    return irALoginConError();
  }
}
