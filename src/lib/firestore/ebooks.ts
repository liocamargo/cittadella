import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import type { Ebook } from "@/types";

const COL = "Ebooks";

function toEbook(id: string, data: Record<string, unknown>): Ebook {
  return {
    id,
    bibliotecaId: (data.bibliotecaId as string) ?? "",
    isbn: (data.isbn as string) ?? "",
    formato: (data.formato as Ebook["formato"]) ?? "epub",
    storagePath: (data.storagePath as string) ?? "",
    archivoUrl: (data.archivoUrl as string) ?? "",
    tamanio: (data.tamanio as number) ?? 0,
    sha256: (data.sha256 as string) ?? "",
    agregadoPor: (data.agregadoPor as string) ?? "",
    agregadoEn: (data.agregadoEn as string) ?? "",
    koreaderDigest: data.koreaderDigest as string | undefined,
  };
}

/** Archivos digitales ya cargados para un libro puntual de una biblioteca. */
export function listenEbooksDeLibro(
  bibliotecaId: string,
  isbn: string,
  onChange: (ebooks: Ebook[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where("bibliotecaId", "==", bibliotecaId),
    where("isbn", "==", isbn)
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toEbook(d.id, d.data())));
  });
}

/** Todos los archivos digitales de una biblioteca, para cruzar contra el progreso de KOSync. */
export function listenEbooksDeBiblioteca(
  bibliotecaId: string,
  onChange: (ebooks: Ebook[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("bibliotecaId", "==", bibliotecaId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toEbook(d.id, d.data())));
  });
}

/**
 * Vincula manualmente un progreso de KOSync sin resolver a este ebook,
 * guardando el digest que mandó KOReader. A partir de ahí, ese progreso
 * se resuelve solo (ver `leyendo-ahora.tsx`).
 */
export async function vincularDigestKosync(ebookId: string, digest: string): Promise<void> {
  await updateDoc(doc(db, COL, ebookId), { koreaderDigest: digest });
}

/** Genera el id que va a tener el ebook antes de subir el archivo, para nombrarlo en Storage. */
export function generarEbookId(): string {
  return doc(collection(db, COL)).id;
}

export async function crearEbook(
  id: string,
  datos: Omit<Ebook, "id" | "agregadoEn">
): Promise<void> {
  await setDoc(doc(db, COL, id), { ...datos, agregadoEn: new Date().toISOString() });
}

export async function eliminarEbook(ebook: Ebook): Promise<void> {
  await deleteDoc(doc(db, COL, ebook.id));
  await deleteObject(ref(storage, ebook.storagePath)).catch(() => {
    // El doc ya se borró; si el objeto de Storage no existe más, no hay nada que limpiar.
  });
}
