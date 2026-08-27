import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/log";

// firebase-admin requiere APIs nativas de Node (crypto, fs, etc.) y no puede
// correr en Edge Runtime. Forzarlo es obligatorio en Vercel, donde los Route
// Handlers a veces se ejecutan en Edge y mueren al cargar el módulo (500 HTML
// genérico que nunca llega al JSON de error de este handler).
export const runtime = "nodejs";

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
      {
        error: "Firebase Admin no está configurado en el servidor.",
        detalle: process.env.NODE_ENV === "development" ? String(err) : undefined,
      },
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

  try {
    await getAdminDb()
      .collection("Perfiles")
      .doc(uid)
      .set({ claveSincronizacionHash }, { merge: true });
  } catch (err) {
    logError("Error guardando la clave de sincronización:", err);
    const parts =
      typeof err === "object" && err !== null && "code" in err
        ? [`${(err as { code: unknown }).code}`]
        : [];
    if (err instanceof Error && err.message) parts.push(err.message);
    return NextResponse.json(
      {
        error: "No pudimos guardar la clave en el servidor.",
        detalle:
          process.env.NODE_ENV === "development"
            ? parts.join(" — ")
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ usuario: uid, clave });
}
