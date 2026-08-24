import { NextResponse } from "next/server";
import { verificarCredencialesKosync } from "@/lib/kosync/auth";

export async function GET(request: Request) {
  const credenciales = await verificarCredencialesKosync(request);
  if (!credenciales) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ username: credenciales.uid });
}
