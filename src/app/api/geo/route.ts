import { NextResponse } from "next/server";

/**
 * País del visitante según el edge de Vercel (gratis, sin servicio externo).
 * Fuera de Vercel (dev local, otros hosts) el header no existe y devolvemos null.
 */
export async function GET(request: Request) {
  const pais =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;
  return NextResponse.json({ pais });
}
