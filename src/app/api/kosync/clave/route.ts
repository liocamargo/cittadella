import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/log";

/**
 * Genera una clave de sincronización KOReader/KOSync nueva para el usuario
 * autenticado (invalida cualquier clave anterior). La clave en texto plano
 * solo se devuelve en esta respuesta; en Firestore únicamente se guarda su
 * hash MD5, que es lo que el propio protocolo KOSync manda en cada request.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Falta autenticación." }, { status: 401 });
  }

  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    logError("Firebase Admin no está configurado:", err);
    return NextResponse.json(
      { error: "Firebase Admin no está configurado en el servidor." },
      { status: 500 }
    );
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 401 });
  }

  const clave = randomBytes(16).toString("hex");
  const claveSincronizacionHash = createHash("md5").update(clave).digest("hex");

  await getAdminDb()
    .collection("Perfiles")
    .doc(uid)
    .set({ claveSincronizacionHash }, { merge: true });

  return NextResponse.json({ usuario: uid, clave });
}
