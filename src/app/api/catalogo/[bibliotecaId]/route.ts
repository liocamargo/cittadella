import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/log";

export interface LibroCatalogoPublico {
  id: string;
  isbn: string;
  estante: string;
  estado: "disponible" | "prestado";
}

export interface CatalogoPublicoResponse {
  nombre: string;
  bibliotecarioNombre: string;
  bibliotecarioEmail: string;
  bibliotecarioWhatsapp: string;
  libros: LibroCatalogoPublico[];
}

/**
 * Proyección pública y de solo lectura de una biblioteca. Se sirve desde acá
 * (con Admin SDK, que ignora las reglas de Firestore) en vez de dejar que el
 * cliente lea los documentos de Bibliotecas/Libros_En_Biblioteca directo:
 * esos documentos completos incluyen emails/whatsapp de todos los miembros,
 * invitaciones pendientes y datos de préstamo (notas, a quién se le prestó)
 * que no deben salir de la biblioteca aunque el catálogo sea público.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bibliotecaId: string }> }
) {
  const { bibliotecaId } = await params;

  let db;
  try {
    db = getAdminDb();
  } catch (err) {
    logError("Firebase Admin no está configurado:", err);
    return NextResponse.json({ error: "No disponible." }, { status: 500 });
  }

  const bibliotecaSnap = await db.collection("Bibliotecas").doc(bibliotecaId).get();
  if (!bibliotecaSnap.exists) {
    return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  }

  const biblioteca = bibliotecaSnap.data()!;
  if (biblioteca.catalogoPublico !== true) {
    return NextResponse.json({ error: "No es pública." }, { status: 404 });
  }

  const creadaPor = (biblioteca.creadaPor as string) ?? "";
  const nombresMiembros = (biblioteca.nombresMiembros as Record<string, string>) ?? {};
  const emailsMiembros = (biblioteca.emailsMiembros as Record<string, string>) ?? {};
  const whatsappMiembros = (biblioteca.whatsappMiembros as Record<string, string>) ?? {};

  const librosSnap = await db
    .collection("Libros_En_Biblioteca")
    .where("bibliotecaId", "==", bibliotecaId)
    .get();

  const libros: LibroCatalogoPublico[] = librosSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      isbn: (data.isbn as string) ?? "",
      estante: (data.estante as string) ?? "",
      estado: data.estado === "prestado" ? "prestado" : "disponible",
    };
  });

  const respuesta: CatalogoPublicoResponse = {
    nombre: (biblioteca.nombre as string) ?? "",
    bibliotecarioNombre: nombresMiembros[creadaPor] ?? emailsMiembros[creadaPor] ?? "",
    bibliotecarioEmail: emailsMiembros[creadaPor] ?? "",
    bibliotecarioWhatsapp: whatsappMiembros[creadaPor] ?? "",
    libros,
  };

  return NextResponse.json(respuesta);
}
