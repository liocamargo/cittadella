import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { LibroEnBiblioteca, LibroGlobal, Resena } from "@/types";

const GLOBALES = "Libros_Globales";
const COPIAS = "Libros_En_Biblioteca";

function toLibroGlobal(isbn: string, data: Record<string, unknown>): LibroGlobal {
  return {
    isbn,
    titulo: (data.titulo as string) ?? "",
    subtitulo: data.subtitulo as string | undefined,
    autor: (data.autor as string) ?? "",
    editorial: data.editorial as string | undefined,
    anio: data.anio as string | undefined,
    paginas: data.paginas as string | undefined,
    idioma: data.idioma as string | undefined,
    genero: data.genero as string | undefined,
    sinopsis: data.sinopsis as string | undefined,
    portadaUrl: data.portadaUrl as string | undefined,
    propietarios: (data.propietarios as number) ?? 0,
    ratingPromedio: (data.ratingPromedio as number) ?? 0,
    totalResenas: (data.totalResenas as number) ?? 0,
  };
}

function toCopia(id: string, data: Record<string, unknown>): LibroEnBiblioteca {
  return {
    id,
    bibliotecaId: (data.bibliotecaId as string) ?? "",
    isbn: (data.isbn as string) ?? "",
    estante: (data.estante as string) ?? "",
    tipoTapa: data.tipoTapa as string | undefined,
    notas: data.notas as string | undefined,
    estado: (data.estado as LibroEnBiblioteca["estado"]) ?? "disponible",
    prestadoA: data.prestadoA as string | undefined,
    fechaPrestamo: data.fechaPrestamo as string | undefined,
    fechaLimite: data.fechaLimite as string | undefined,
    favorito: Boolean(data.favorito),
    leido: Boolean(data.leido),
    fechaAgregado: (data.fechaAgregado as string) ?? "",
  };
}

export async function getLibroGlobal(isbn: string): Promise<LibroGlobal | null> {
  const snap = await getDoc(doc(db, GLOBALES, isbn));
  return snap.exists() ? toLibroGlobal(isbn, snap.data()) : null;
}

export function listenInventario(
  bibliotecaId: string,
  onChange: (copias: LibroEnBiblioteca[]) => void
): Unsubscribe {
  const q = query(collection(db, COPIAS), where("bibliotecaId", "==", bibliotecaId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toCopia(d.id, d.data())));
  });
}

export interface DatosComunidad {
  titulo: string;
  subtitulo?: string;
  autor: string;
  editorial?: string;
  anio?: string;
  paginas?: string;
  idioma?: string;
  genero?: string;
  sinopsis?: string;
  portadaUrl?: string;
}

export interface DatosCopia {
  estante: string;
  tipoTapa?: string;
  notas?: string;
}

/** Crea (o enriquece) el libro comunitario por ISBN y agrega la copia física a la biblioteca. */
export async function agregarLibroABiblioteca(
  isbn: string,
  bibliotecaId: string,
  comunidad: DatosComunidad,
  copia: DatosCopia
): Promise<void> {
  const globalRef = doc(db, GLOBALES, isbn);
  const copiaRef = doc(collection(db, COPIAS));

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(globalRef);
    if (globalSnap.exists()) {
      tx.update(globalRef, { propietarios: increment(1) });
    } else {
      tx.set(globalRef, {
        ...comunidad,
        propietarios: 1,
        ratingPromedio: 0,
        totalResenas: 0,
      });
    }
    tx.set(copiaRef, {
      bibliotecaId,
      isbn,
      estante: copia.estante,
      tipoTapa: copia.tipoTapa ?? "",
      notas: copia.notas ?? "",
      estado: "disponible",
      favorito: false,
      leido: false,
      fechaAgregado: new Date().toISOString(),
    });
  });
}

export async function actualizarCopia(
  copiaId: string,
  data: Partial<Pick<LibroEnBiblioteca, "estante" | "tipoTapa" | "notas">>
) {
  await updateDoc(doc(db, COPIAS, copiaId), data);
}

export async function prestarLibro(
  copiaId: string,
  prestadoA: string,
  fechaPrestamo: string
) {
  await updateDoc(doc(db, COPIAS, copiaId), {
    estado: "prestado",
    prestadoA,
    fechaPrestamo,
  });
}

export async function devolverLibro(copiaId: string) {
  await updateDoc(doc(db, COPIAS, copiaId), {
    estado: "disponible",
    prestadoA: deleteField(),
    fechaPrestamo: deleteField(),
    fechaLimite: deleteField(),
  });
}

export async function toggleFavorito(copiaId: string, favorito: boolean) {
  await updateDoc(doc(db, COPIAS, copiaId), { favorito });
}

export async function toggleLeido(copiaId: string, leido: boolean) {
  await updateDoc(doc(db, COPIAS, copiaId), { leido });
}

export async function eliminarCopia(copiaId: string) {
  await deleteDoc(doc(db, COPIAS, copiaId));
}

export async function renombrarEstanteEnCopias(
  bibliotecaId: string,
  anterior: string,
  nuevo: string
) {
  const q = query(
    collection(db, COPIAS),
    where("bibliotecaId", "==", bibliotecaId),
    where("estante", "==", anterior)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { estante: nuevo }));
  await batch.commit();
}

// --- Reseñas comunitarias ---

function toResena(id: string, data: Record<string, unknown>): Resena {
  return {
    id,
    usuarioUid: (data.usuarioUid as string) ?? "",
    usuarioNombre: (data.usuarioNombre as string) ?? "",
    estrellas: (data.estrellas as number) ?? 0,
    comentario: (data.comentario as string) ?? "",
    creadoEn: (data.creadoEn as string) ?? "",
  };
}

export function listenResenas(
  isbn: string,
  onChange: (resenas: Resena[]) => void
): Unsubscribe {
  const q = collection(db, GLOBALES, isbn, "resenas");
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs
        .map((d) => toResena(d.id, d.data()))
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    );
  });
}

export async function publicarResena(
  isbn: string,
  uid: string,
  usuarioNombre: string,
  estrellas: number,
  comentario: string
) {
  const resenaRef = doc(db, GLOBALES, isbn, "resenas", uid);
  await setDoc(resenaRef, {
    usuarioUid: uid,
    usuarioNombre,
    estrellas,
    comentario,
    creadoEn: new Date().toISOString(),
  });

  const todas = await getDocs(collection(db, GLOBALES, isbn, "resenas"));
  const valores = todas.docs.map((d) => (d.data().estrellas as number) ?? 0);
  const promedio = valores.length
    ? valores.reduce((a, b) => a + b, 0) / valores.length
    : 0;

  await updateDoc(doc(db, GLOBALES, isbn), {
    ratingPromedio: Math.round(promedio * 10) / 10,
    totalResenas: valores.length,
  });
}
