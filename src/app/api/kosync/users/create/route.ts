import { NextResponse } from "next/server";

/**
 * El protocolo KOSync permite crear usuarios desde el propio KOReader, pero
 * en Cittadella el alta se hace generando una clave desde "Mi cuenta" (ver
 * /api/kosync/clave). Se responde siempre 402 ("username ya existe"), el
 * mismo código que usa el protocolo, para que el plugin le indique al
 * usuario que use "Login" en vez de "Register".
 */
export async function POST() {
  return NextResponse.json(
    { message: "Username is already registered." },
    { status: 402 }
  );
}
