import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verificarCredencialesKosync } from "@/lib/kosync/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ document: string }> }
) {
  const credenciales = await verificarCredencialesKosync(request);
  if (!credenciales) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { document } = await params;
  const snap = await getAdminDb()
    .collection("KosyncProgreso")
    .doc(`${credenciales.uid}_${document}`)
    .get();

  // El servidor oficial de KOSync responde 200 con objeto vacío cuando no
  // hay progreso guardado todavía, no 404.
  if (!snap.exists) {
    return NextResponse.json({});
  }

  const data = snap.data()!;
  return NextResponse.json({
    document,
    progress: data.progress,
    percentage: data.percentage,
    device: data.device,
    device_id: data.deviceId,
  });
}
