import {
  arrayUnion,
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
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type {
  HistorialPrestamo,
  LibroEnBiblioteca,
  LibroGlobal,
  Resena,
} from "@/types";
import { logError } from "@/lib/log";
import { normalizeString } from "@/lib/utils";

const GLOBALES = "Libros_Globales";
const COPIAS = "Libros_En_Biblioteca";
const HISTORIAL = "HistorialPrestamos";
const OBRAS = "Obras";

/**
 * Autores de un campo "A, B, C" como claves canónicas (normalizeString),
 * para control de autoridades: "García, J." y "garcia j" colapsan en uno.
 */
export function normalizarAutores(autor: string): string[] {
  return autor
    .split(",")
    .map((a) => normalizeString(a))
    .filter(Boolean);
}

/** Conectores entre coautores que no aportan identidad ("Autor A y Autor B"). */
const CONECTORES_AUTOR = new Set(["y", "and", "e"]);

/**
 * Clave de autor para agrupar obras: bolsa de palabras normalizadas y
 * ordenadas alfabéticamente, sin importar el orden en que se escribieron.
 * Así "J.R.R. Tolkien" y "Tolkien, J.R.R." colapsan en la misma clave, igual
 * que "Gabriel García Márquez" y "García Márquez, Gabriel".
 */
function claveAutorObra(autor: string): string {
  const tokens = normalizeString(autor)
    .split("_")
    .filter((t) => t && !CONECTORES_AUTOR.has(t));
  return [...new Set(tokens)].sort().join("_");
}

/** Palabras de edición/formato que no distinguen la obra en sí. */
const RUIDO_TITULO = new Set([
  "edicion",
  "ilustrada",
  "ilustrado",
  "especial",
  "revisada",
  "revisado",
  "aniversario",
  "definitiva",
  "definitivo",
  "conmemorativa",
  "conmemorativo",
  "tapa",
  "dura",
  "blanda",
  "bolsillo",
  "coleccionista",
  "deluxe",
]);

/**
 * Clave de título para agrupar obras: descarta paréntesis/corchetes
 * ("(Edición ilustrada)") y palabras de formato/edición, para que esas
 * variantes de la misma obra terminen bajo la misma clave. El orden de las
 * palabras restantes se conserva porque en un título sí importa.
 */
function claveTituloObra(titulo: string): string {
  const sinAclaraciones = titulo.replace(/[([][^)\]]*[)\]]/g, " ");
  return normalizeString(sinAclaraciones)
    .split("_")
    .filter((t) => t && !RUIDO_TITULO.has(t))
    .join("_");
}

/** ID de la obra que agrupa las ediciones: título + autor con variantes unificadas. */
export function generarObraId(titulo: string, autor: string): string {
  return [claveTituloObra(titulo), claveAutorObra(autor)]
    .filter(Boolean)
    .join("__");
}

interface CamposDerivados {
  titulo_normalizado: string;
  autores_normalizados: string[];
  obra_id: string;
}

function camposDerivados(comunidad: DatosComunidad): CamposDerivados {
  return {
    titulo_normalizado: normalizeString(comunidad.titulo),
    autores_normalizados: normalizarAutores(comunidad.autor),
    obra_id: generarObraId(comunidad.titulo, comunidad.autor),
  };
}

/** Decide crear o enriquecer el doc por ISBN; completa campos normalizados si faltan (docs viejos). */
function guardarLibroGlobalEnTx(
  tx: Transaction,
  snap: DocumentSnapshot,
  ref: DocumentReference,
  comunidad: DatosComunidad,
  derivados: CamposDerivados,
  sumaPropietario: boolean
) {
  if (snap.exists()) {
    tx.update(ref, {
      ...(sumaPropietario ? { propietarios: increment(1) } : {}),
      ...(snap.data().obra_id ? {} : derivados),
    });
  } else {
    tx.set(ref, {
      ...comunidad,
      ...derivados,
      propietarios: sumaPropietario ? 1 : 0,
      ratingPromedio: 0,
      totalResenas: 0,
    });
  }
}

/**
 * Agrupa la edición bajo su obra: si existe, agrega el ISBN al array y suma
 * al contador solo cuando entra una copia física; si no, crea el doc.
 * Sin obra_id (título y autor vacíos) no hay nada que agrupar y se omite.
 */
function guardarObraEnTx(
  tx: Transaction,
  snap: DocumentSnapshot | null,
  ref: DocumentReference | null,
  isbn: string,
  comunidad: DatosComunidad,
  derivados: CamposDerivados,
  sumaPropietario: boolean
) {
  if (!ref || !snap || !derivados.obra_id) return;
  const base = {
    titulo: comunidad.titulo,
    autorPrincipal: comunidad.autor.split(",")[0].trim(),
    titulo_normalizado: derivados.titulo_normalizado,
    autores_normalizados: derivados.autores_normalizados,
  };
  if (snap.exists()) {
    tx.update(ref, {
      ...base,
      isbns_asociados: arrayUnion(isbn),
      ...(sumaPropietario ? { propietarios: increment(1) } : {}),
    });
  } else {
    tx.set(ref, {
      ...base,
      isbns_asociados: [isbn],
      propietarios: sumaPropietario ? 1 : 0,
      ratingPromedio: 0,
      totalResenas: 0,
    });
  }
}

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
    autores_normalizados: Array.isArray(data.autores_normalizados)
      ? (data.autores_normalizados as string[])
      : undefined,
    titulo_normalizado: data.titulo_normalizado as string | undefined,
    obra_id: data.obra_id as string | undefined,
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
    progreso: typeof data.progreso === "number" ? data.progreso : undefined,
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
  const derivados = camposDerivados(comunidad);
  const obraRef = derivados.obra_id ? doc(db, OBRAS, derivados.obra_id) : null;

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(globalRef);
    const obraSnap = obraRef ? await tx.get(obraRef) : null;

    guardarLibroGlobalEnTx(tx, globalSnap, globalRef, comunidad, derivados, true);
    guardarObraEnTx(tx, obraSnap, obraRef, isbn, comunidad, derivados, true);

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
  comunidad: DatosComunidad,
  progreso: number = 100
): Promise<void> {
  const globalRef = doc(db, GLOBALES, isbn);
  const lecturaRef = doc(db, "Lecturas", `${uid}_${isbn}`);
  const derivados = camposDerivados(comunidad);
  const obraRef = derivados.obra_id ? doc(db, OBRAS, derivados.obra_id) : null;

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(globalRef);
    const obraSnap = obraRef ? await tx.get(obraRef) : null;

    // Sin copia física: no suma a "propietarios".
    guardarLibroGlobalEnTx(tx, globalSnap, globalRef, comunidad, derivados, false);
    guardarObraEnTx(tx, obraSnap, obraRef, isbn, comunidad, derivados, false);

    tx.set(lecturaRef, {
      uid,
      isbn,
      fechaLeido: new Date().toISOString(),
      progreso,
    });
  });
}

/**
 * Agrega un libro a la lista de deseos del usuario sin agregarlo a ninguna
 * biblioteca física: crea/enriquece Libros_Globales si hace falta (sin
 * sumar a "propietarios", porque no es una copia física) y crea el
 * registro en Deseos.
 */
export async function agregarDeseo(
  isbn: string,
  uid: string,
  comunidad: DatosComunidad
): Promise<void> {
  const globalRef = doc(db, GLOBALES, isbn);
  const deseoRef = doc(db, "Deseos", `${uid}_${isbn}`);
  const derivados = camposDerivados(comunidad);
  const obraRef = derivados.obra_id ? doc(db, OBRAS, derivados.obra_id) : null;

  await runTransaction(db, async (tx) => {
    const globalSnap = await tx.get(globalRef);
    const obraSnap = obraRef ? await tx.get(obraRef) : null;

    // Sin copia física: no suma a "propietarios".
    guardarLibroGlobalEnTx(tx, globalSnap, globalRef, comunidad, derivados, false);
    guardarObraEnTx(tx, obraSnap, obraRef, isbn, comunidad, derivados, false);

    tx.set(deseoRef, {
      uid,
      isbn,
      fechaAgregado: new Date().toISOString(),
    });
  });
}

/**
 * Cambia el ISBN de una copia ya existente (p.ej. para corregir un error de
 * tipeo o de escaneo). Si el ISBN nuevo ya tiene un libro comunitario, se
 * suma como otro propietario; si no, se crea uno con los datos actuales.
 */
export async function cambiarIsbnCopia(
  copiaId: string,
  isbnNuevo: string,
  comunidad: DatosComunidad
): Promise<void> {
  const nuevoRef = doc(db, GLOBALES, isbnNuevo);
  const derivados = camposDerivados(comunidad);
  const obraRef = derivados.obra_id ? doc(db, OBRAS, derivados.obra_id) : null;

  await runTransaction(db, async (tx) => {
    const nuevoSnap = await tx.get(nuevoRef);
    const obraSnap = obraRef ? await tx.get(obraRef) : null;

    // La copia física se mueva a la edición nueva: suma propietario ahí.
    guardarLibroGlobalEnTx(tx, nuevoSnap, nuevoRef, comunidad, derivados, true);
    guardarObraEnTx(tx, obraSnap, obraRef, isbnNuevo, comunidad, derivados, true);

    tx.update(doc(db, COPIAS, copiaId), { isbn: isbnNuevo });
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
  socioId?: string,
  fechaLimite?: string
): Promise<void> {
  const historialRef = doc(collection(db, HISTORIAL));
  await setDoc(historialRef, {
    bibliotecaId: copia.bibliotecaId,
    copiaId: copia.id,
    isbn: copia.isbn,
    socioId: socioId || undefined,
    prestadoA,
    fechaPrestamo,
    fechaLimite: fechaLimite || undefined,
  });
  await updateDoc(doc(db, COPIAS, copia.id), {
    estado: "prestado",
    prestadoA,
    prestadoASocioId: socioId || deleteField(),
    fechaPrestamo,
    fechaLimite: fechaLimite || deleteField(),
    historialActivoId: historialRef.id,
  });
}

/**
 * Un préstamo está vencido si tiene fecha límite y ya pasó. Compara solo
 * por fecha (no por hora) para no depender de la zona horaria del usuario.
 */
export function estaVencido(fechaLimite?: string): boolean {
  if (!fechaLimite) return false;
  return fechaLimite < new Date().toISOString().slice(0, 10);
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
  await updateDoc(doc(db, COPIAS, copiaId), {
    leido,
    ...(leido ? { progreso: 100 } : {}),
  });
}

export async function actualizarProgreso(copiaId: string, progreso: number) {
  await updateDoc(doc(db, COPIAS, copiaId), { progreso });
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
  const ratingPromedio = Math.round(promedio * 10) / 10;

  await updateDoc(doc(db, GLOBALES, isbn), {
    ratingPromedio,
    totalResenas: valores.length,
  });

  await actualizarResenasObra(isbn);
}

/**
 * Recalcula el rating y el total de reseñas de la obra sumando los de todas
 * sus ediciones (ya actualizados por edición al publicar la reseña), para
 * que dos ISBNs del mismo libro compartan una sola reputación agregada.
 */
async function actualizarResenasObra(isbn: string): Promise<void> {
  const globalSnap = await getDoc(doc(db, GLOBALES, isbn));
  if (!globalSnap.exists()) return;
  const data = globalSnap.data();
  const obraId =
    (data.obra_id as string | undefined) ??
    generarObraId((data.titulo as string) ?? "", (data.autor as string) ?? "");
  if (!obraId) return;

  const obraRef = doc(db, OBRAS, obraId);
  const obraSnap = await getDoc(obraRef);
  if (!obraSnap.exists()) return;
  const isbnsAsociados = (obraSnap.data().isbns_asociados as string[]) ?? [isbn];

  const ediciones = await Promise.all(
    isbnsAsociados.map((edicionIsbn) => getDoc(doc(db, GLOBALES, edicionIsbn)))
  );
  const totalResenas = ediciones.reduce(
    (suma, snap) => suma + ((snap.data()?.totalResenas as number) ?? 0),
    0
  );
  const sumaPonderada = ediciones.reduce(
    (suma, snap) =>
      suma +
      ((snap.data()?.ratingPromedio as number) ?? 0) *
        ((snap.data()?.totalResenas as number) ?? 0),
    0
  );
  const ratingPromedio = totalResenas
    ? Math.round((sumaPonderada / totalResenas) * 10) / 10
    : 0;

  await updateDoc(obraRef, { ratingPromedio, totalResenas });
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
 * Libros que ya tienen otras bibliotecas (propietarios > 0), con sinopsis
 * cargada, y no están en isbnsPropios. Se priorizan los que más bibliotecas
 * tienen y, entre esos, los que ya tienen alguna reseña. Los empates rotan
 * cada semana ISO (estables durante la semana, distintos la siguiente) para
 * no repetir siempre el mismo orden entre libros igual de populares. Si el
 * usuario eligió géneros favoritos (Mi cuenta), se priorizan esos géneros;
 * el resto de los lugares se completa con libros de cualquier género para
 * seguir permitiendo el descubrimiento.
 */
export async function getSeleccionSemanal(
  isbnsPropios: string[],
  generosFavoritos: string[] = []
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
        Boolean(l.genero) &&
        Boolean(l.sinopsis)
    );

  const random = crearGeneradorSeed(hashString(claveSemanaActual()));
  const desempate = new Map(candidatos.map((l) => [l.isbn, random()]));

  const ordenados = [...candidatos].sort((a, b) => {
    if (b.propietarios !== a.propietarios) return b.propietarios - a.propietarios;
    const tieneResenasA = a.totalResenas > 0 ? 1 : 0;
    const tieneResenasB = b.totalResenas > 0 ? 1 : 0;
    if (tieneResenasB !== tieneResenasA) return tieneResenasB - tieneResenasA;
    return (desempate.get(a.isbn) ?? 0) - (desempate.get(b.isbn) ?? 0);
  });

  if (generosFavoritos.length === 0) return ordenados.slice(0, 8);

  const favoritos = new Set(generosFavoritos);
  const preferidos = ordenados.filter((l) => favoritos.has(l.genero ?? ""));
  const otros = ordenados.filter((l) => !favoritos.has(l.genero ?? ""));
  return [...preferidos, ...otros].slice(0, 8);
}

/** Autores y editoriales ya cargados en la comunidad, para autocompletar formularios. */
export async function obtenerSugerenciasComunidad(): Promise<{
  autores: string[];
  editoriales: string[];
}> {
  const snap = await getDocs(query(collection(db, GLOBALES), limit(500)));
  const autores = new Set<string>();
  const editoriales = new Set<string>();
  const clavesAutorVistas = new Set<string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    const autor = ((data.autor as string) ?? "").trim();
    const editorial = ((data.editorial as string) ?? "").trim();
    // Control de autoridades: "Gabriel García Márquez" y "GABRIEL GARCIA
    // MARQUEZ" son la misma sugerencia; gana la primera variante vista.
    if (autor) {
      const clave = normalizeString(autor);
      if (!clavesAutorVistas.has(clave)) {
        clavesAutorVistas.add(clave);
        autores.add(autor);
      }
    }
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
