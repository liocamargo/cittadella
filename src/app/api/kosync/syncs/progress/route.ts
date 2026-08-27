import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verificarCredencialesKosync } from "@/lib/kosync/auth";

export const runtime = "nodejs";

interface ProgresoBody {
  document?: string;
  progress?: string;
  percentage?: number;
  device?: string;
  device_id?: string;
}

export async function PUT(request: Request) {
  const credenciales = await verificarCredencialesKosync(request);
  if (!credenciales) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: ProgresoBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const { document, progress, percentage, device, device_id: deviceId } = body;
  if (!document || progress === undefined || percentage === undefined) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const { uid } = credenciales;
  await getAdminDb()
    .collection("KosyncProgreso")
    .doc(`${uid}_${document}`)
    .set(
      {
        uid,
        document,
        progress,
        percentage,
        device: device ?? "",
        deviceId: deviceId ?? "",
        actualizadoEn: new Date().toISOString(),
      },
      { merge: true }
    );

  return NextResponse.json({ document, timestamp: Date.now() });
}
