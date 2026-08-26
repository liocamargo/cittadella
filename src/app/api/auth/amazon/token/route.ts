import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_COOKIE = "amazon_custom_token";

/** Entrega una sola vez el custom token que dejó el callback de Amazon, y lo borra. */
export async function GET() {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "No hay login de Amazon pendiente." }, { status: 401 });
  }
  store.delete(TOKEN_COOKIE);
  return NextResponse.json({ token });
}
