import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
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
