import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
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
import type { HistorialPrestamo, LibroEnBiblioteca, LibroGlobal, Resena } from "@/types";
import { logError } from "@/lib/log";

const GLOBALES = "Libros_Globales";
const COPIAS = "Libros_En_Biblioteca";
const HISTORIAL = "HistorialPrestamos";

function toLibroGlobal(isbn: string, data: Record<string, unknown>): LibroGlobal {
  return {
    isbn,
    titulo: (data.titulo as string) ?? "",
    subtitulo: data.subtitulo as string | undefined,
    autor: (data.autor as string) ?? "",
    ilustrador: data.ilustrador as string | undefined,
    editorial: data.editorial as string | undefined,
    anio: data.anio as string | undefined,
    paginas: data.paginas as string | undefined,
    volumen: data.volumen as string | undefined,
    idioma: data.idioma as string | undefined,
    genero: data.genero as string | undefined,
    sinopsis: data.sinopsis as string | undefined,
    portadaUrl: data.portadaUrl as string | undefined,
    previewLink: data.previewLink as string | undefined,
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
    prestadoASocioId: data.prestadoASocioId as string | undefined,
    historialActivoId: data.historialActivoId as string | undefined,
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

/** Versión en tiempo real de getLibroGlobal: se actualiza sola ante cualquier cambio. */
export function listenLibroGlobal(
  isbn: string,
  onChange: (libro: LibroGlobal | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, GLOBALES, isbn),
    (snap) => onChange(snap.exists() ? toLibroGlobal(isbn, snap.data()) : null),
    () => onChange(null)
  );
}

export async function actualizarPortada(isbn: string, portadaUrl: string): Promise<void> {
  await updateDoc(doc(db, GLOBALES, isbn), { portadaUrl });
}

export async function actualizarLibroGlobal(
  isbn: string,
  data: Partial<DatosComunidad>
): Promise<void> {
  await updateDoc(doc(db, GLOBALES, isbn), { ...data });
}

export async function contarCopiasDelIsbn(
  bibliotecaId: string,
  isbn: string
): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, COPIAS),
      where("bibliotecaId", "==", bibliotecaId),
      where("isbn", "==", isbn)
    )
  );
  return snap.size;
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
  ilustrador?: string;
  editorial?: string;
  anio?: string;
  paginas?: string;
  volumen?: string;
  idioma?: string;
  genero?: string;
  sinopsis?: string;
  portadaUrl?: string;
  previewLink?: string;
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

/**
 * Marca un libro como leído por el usuario sin agregarlo a ninguna
 * biblioteca física: crea/enriquece Libros_Globales si hace falta (sin
 * sumar a "propietarios", porque no es una copia física) y crea el
 * registro en Lecturas.
 */
export async function agregarLibroLeido(
  isbn: string,
  uid: string,
  comunidad: DatosComunidad
): Promise<void> {
  const globalRef = doc(db, GLOBALES, isbn);
  const lecturaRef = doc(db, "Lecturas", `${uid}_${isbn}`);

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(globalRef);
    if (!globalSnap.exists()) {
      tx.set(globalRef, {
        ...comunidad,
        propietarios: 0,
        ratingPromedio: 0,
        totalResenas: 0,
      });
    }
    tx.set(lecturaRef, {
      uid,
      isbn,
      fechaLeido: new Date().toISOString(),
    });
  });
}

export async function actualizarCopia(
  copiaId: string,
  data: Partial<Pick<LibroEnBiblioteca, "estante" | "tipoTapa" | "notas">>
) {
  await updateDoc(doc(db, COPIAS, copiaId), data);
}

/**
 * Registra el préstamo en la copia y abre un registro en HistorialPrestamos
 * (se cierra recién al devolver). `copia` solo necesita id/bibliotecaId/isbn.
 */
export async function prestarLibro(
  copia: Pick<LibroEnBiblioteca, "id" | "bibliotecaId" | "isbn">,
  prestadoA: string,
  fechaPrestamo: string,
  socioId?: string
): Promise<void> {
  const historialRef = doc(collection(db, HISTORIAL));
  await setDoc(historialRef, {
    bibliotecaId: copia.bibliotecaId,
    copiaId: copia.id,
    isbn: copia.isbn,
    socioId: socioId || undefined,
    prestadoA,
    fechaPrestamo,
  });
  await updateDoc(doc(db, COPIAS, copia.id), {
    estado: "prestado",
    prestadoA,
    prestadoASocioId: socioId || deleteField(),
    fechaPrestamo,
    historialActivoId: historialRef.id,
  });
}

/** `historialActivoId` es el que quedó guardado en la copia al prestarlo. */
export async function devolverLibro(
  copiaId: string,
  historialActivoId?: string
): Promise<void> {
  if (historialActivoId) {
    await updateDoc(doc(db, HISTORIAL, historialActivoId), {
      fechaDevolucion: new Date().toISOString(),
    }).catch((err) => logError("Error cerrando el historial del préstamo:", err));
  }
  await updateDoc(doc(db, COPIAS, copiaId), {
    estado: "disponible",
    prestadoA: deleteField(),
    prestadoASocioId: deleteField(),
    fechaPrestamo: deleteField(),
    fechaLimite: deleteField(),
    historialActivoId: deleteField(),
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

// --- Selección de la semana ---

function claveSemanaActual(): string {
  const ahora = new Date();
  const inicioAnio = new Date(Date.UTC(ahora.getUTCFullYear(), 0, 1));
  const dias = Math.floor((ahora.getTime() - inicioAnio.getTime()) / 86400000);
  const semana = Math.ceil((dias + inicioAnio.getUTCDay() + 1) / 7);
  return `${ahora.getUTCFullYear()}-W${semana}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32) para que la selección sea estable durante la semana. */
function crearGeneradorSeed(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Libros que ya tienen otras bibliotecas (propietarios > 0) y no están en
 * isbnsPropios. La selección es estable durante la semana ISO actual y
 * rota la semana siguiente.
 */
export async function getSeleccionSemanal(
  isbnsPropios: string[]
): Promise<LibroGlobal[]> {
  const snap = await getDocs(query(collection(db, GLOBALES), limit(500)));
  const propios = new Set(isbnsPropios);
  const candidatos = snap.docs
    .map((d) => toLibroGlobal(d.id, d.data()))
    .filter(
      (l) =>
        l.propietarios > 0 &&
        !propios.has(l.isbn) &&
        Boolean(l.portadaUrl) &&
        Boolean(l.autor) &&
        Boolean(l.genero)
    );

  const random = crearGeneradorSeed(hashString(claveSemanaActual()));
  const mezclados = [...candidatos];
  for (let i = mezclados.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
  }
  return mezclados.slice(0, 8);
}

/** Autores y editoriales ya cargados en la comunidad, para autocompletar formularios. */
export async function obtenerSugerenciasComunidad(): Promise<{
  autores: string[];
  editoriales: string[];
}> {
  const snap = await getDocs(query(collection(db, GLOBALES), limit(500)));
  const autores = new Set<string>();
  const editoriales = new Set<string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const autor = ((data.autor as string) ?? "").trim();
    const editorial = ((data.editorial as string) ?? "").trim();
    if (autor) autores.add(autor);
    if (editorial) editoriales.add(editorial);
  });
  return {
    autores: Array.from(autores).sort((a, b) => a.localeCompare(b)),
    editoriales: Array.from(editoriales).sort((a, b) => a.localeCompare(b)),
  };
}

// --- Historial de préstamos (modo socios) ---

function toHistorialPrestamo(
  id: string,
  data: Record<string, unknown>
): HistorialPrestamo {
  return {
    id,
    bibliotecaId: (data.bibliotecaId as string) ?? "",
    copiaId: (data.copiaId as string) ?? "",
    isbn: (data.isbn as string) ?? "",
    socioId: data.socioId as string | undefined,
    prestadoA: (data.prestadoA as string) ?? "",
    fechaPrestamo: (data.fechaPrestamo as string) ?? "",
    fechaLimite: data.fechaLimite as string | undefined,
    fechaDevolucion: data.fechaDevolucion as string | undefined,
  };
}

/** Historial de préstamos de un socio puntual, más recientes primero. */
export function listenHistorialDeSocio(
  socioId: string,
  onChange: (historial: HistorialPrestamo[]) => void
): Unsubscribe {
  const q = query(collection(db, HISTORIAL), where("socioId", "==", socioId));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs
        .map((d) => toHistorialPrestamo(d.id, d.data()))
        .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo))
    );
  });
}
