import type { DatosComunidad } from "@/lib/firestore/libros";
import { logError } from "@/lib/log";

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  description?: string;
  language?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
  previewLink?: string;
}

interface GoogleBooksVolume {
  volumeInfo?: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export class GoogleBooksError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GoogleBooksError";
  }

  /** Google limita muy fuerte las consultas anónimas (sin API key) por IP/proyecto. */
  get esLimiteDeCuota() {
    return this.status === 429;
  }
}

/**
 * Mensaje de error para mostrarle al usuario: si fue el límite de cuota de
 * Google Books (muy fácil de pisar sin NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
 * configurada), lo explica; si no, devuelve el mensaje genérico.
 */
export function mensajeErrorBusqueda(err: unknown, generico: string): string {
  if (err instanceof GoogleBooksError && err.esLimiteDeCuota) {
    return "Se alcanzó el límite de búsquedas de Google Books por ahora. Probá de nuevo en un rato, o cargá los datos a mano.";
  }
  return generico;
}

/** ISBN-13 si está disponible; si no, ISBN-10 como respaldo. */
function extraerIsbn(info: GoogleBooksVolumeInfo): string | undefined {
  const ids = info.industryIdentifiers ?? [];
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier
  );
}

function mapVolumeInfo(info: GoogleBooksVolumeInfo): DatosComunidad {
  return {
    titulo: info.title ?? "",
    subtitulo: info.subtitle,
    autor: (info.authors ?? []).join(", "),
    editorial: info.publisher,
    anio: info.publishedDate?.slice(0, 4),
    paginas: info.pageCount ? String(info.pageCount) : undefined,
    idioma: info.language,
    genero: info.categories?.[0],
    sinopsis: info.description,
    portadaUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    previewLink: info.previewLink,
  };
}

/** Una consulta puntual a la API de Google Books, con langRestrict opcional. */
async function consultarGoogleBooks(
  query: Record<string, string>,
  langRestrict?: string
): Promise<GoogleBooksResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams(query);
  if (apiKey) params.set("key", apiKey);
  if (langRestrict) params.set("langRestrict", langRestrict);

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`
  );
  if (!res.ok) {
    throw new GoogleBooksError(`Google Books respondió ${res.status}`, res.status);
  }
  return res.json();
}

/**
 * Prueba la consulta priorizando cada idioma de lectura en orden hasta que
 * uno devuelva resultados; si ninguno encuentra nada (el langRestrict de
 * Google puede dejar afuera la única edición que existe), reintenta sin
 * restricción antes de darse por vencido.
 */
async function consultarConIdiomas(
  query: Record<string, string>,
  idiomasLectura?: string[]
): Promise<GoogleBooksResponse> {
  for (const idioma of idiomasLectura ?? []) {
    const data = await consultarGoogleBooks(query, idioma);
    if (data.items?.length) return data;
  }
  return consultarGoogleBooks(query);
}

/**
 * Busca un ISBN en Google Books. Tira GoogleBooksError si la consulta en sí
 * falla (red, cuota).
 */
async function buscarPorIsbnGoogle(
  isbn: string,
  idiomasLectura?: string[]
): Promise<DatosComunidad | null> {
  const data = await consultarConIdiomas({ q: `isbn:${isbn}` }, idiomasLectura);
  const info = data.items?.[0]?.volumeInfo;
  return info ? mapVolumeInfo(info) : null;
}

interface OpenLibraryBook {
  title?: string;
  subtitle?: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  subjects?: { name: string }[];
  cover?: { small?: string; medium?: string; large?: string };
}

/** Respaldo cuando Google Books falla (cuota, red) o no tiene el ISBN. */
async function buscarPorIsbnOpenLibrary(isbn: string): Promise<DatosComunidad | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
    );
    if (!res.ok) return null;
    const data: Record<string, OpenLibraryBook> = await res.json();
    const libro = data[`ISBN:${isbn}`];
    if (!libro?.title) return null;

    return {
      titulo: libro.title,
      subtitulo: libro.subtitle,
      autor: (libro.authors ?? []).map((a) => a.name).join(", "),
      editorial: libro.publishers?.[0]?.name,
      anio: libro.publish_date?.match(/\d{4}/)?.[0],
      paginas: libro.number_of_pages ? String(libro.number_of_pages) : undefined,
      genero: libro.subjects?.[0]?.name,
      portadaUrl: libro.cover?.medium ?? libro.cover?.large,
    };
  } catch (err) {
    logError("Error consultando Open Library:", err);
    return null;
  }
}

/**
 * Busca un ISBN en Google Books; si falla (cuota, red) o no lo encuentra,
 * cae automáticamente a Open Library antes de rendirse.
 */
export async function buscarPorIsbn(
  isbn: string,
  idiomasLectura?: string[]
): Promise<DatosComunidad | null> {
  try {
    const google = await buscarPorIsbnGoogle(isbn, idiomasLectura);
    if (google) return google;
  } catch (err) {
    logError("Google Books falló, probamos Open Library:", err);
  }
  return buscarPorIsbnOpenLibrary(isbn);
}

export interface ResultadoPortada {
  titulo: string;
  autor: string;
  portadaUrl: string;
}

async function buscarPortadasGoogle(
  consulta: string,
  idiomasLectura?: string[]
): Promise<ResultadoPortada[]> {
  const data = await consultarConIdiomas(
    { q: consulta, maxResults: "12" },
    idiomasLectura
  );

  const resultados: ResultadoPortada[] = [];
  for (const item of data.items ?? []) {
    const info = item.volumeInfo;
    const portadaUrl = info?.imageLinks?.thumbnail?.replace("http://", "https://");
    if (!info?.title || !portadaUrl) continue;
    resultados.push({
      titulo: info.title,
      autor: (info.authors ?? []).join(", "),
      portadaUrl,
    });
  }
  return resultados;
}

interface OpenLibrarySearchDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[];
}

async function buscarPortadasOpenLibrary(consulta: string): Promise<ResultadoPortada[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(consulta)}&limit=12&fields=title,author_name,cover_i`
  );
  if (!res.ok) return [];
  const data: OpenLibrarySearchResponse = await res.json();

  const resultados: ResultadoPortada[] = [];
  for (const doc of data.docs ?? []) {
    if (!doc.title || !doc.cover_i) continue;
    resultados.push({
      titulo: doc.title,
      autor: (doc.author_name ?? []).join(", "),
      portadaUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
    });
  }
  return resultados;
}

/**
 * Busca por título/autor en Google Books y Open Library en paralelo, y
 * combina los resultados: más opciones para elegir, y si Google Books está
 * limitado por cuota (muy fácil de pisar sin API key propia) igual
 * aparecen las de Open Library en vez de no mostrar nada.
 */
export async function buscarPortadas(
  consulta: string,
  idiomasLectura?: string[]
): Promise<ResultadoPortada[]> {
  const [google, openLibrary] = await Promise.allSettled([
    buscarPortadasGoogle(consulta, idiomasLectura),
    buscarPortadasOpenLibrary(consulta),
  ]);

  if (google.status === "rejected") {
    logError("Google Books falló buscando portadas:", google.reason);
  }
  if (openLibrary.status === "rejected") {
    logError("Open Library falló buscando portadas:", openLibrary.reason);
  }
  if (google.status === "rejected" && openLibrary.status === "rejected") {
    throw google.reason;
  }

  const combinados = [
    ...(google.status === "fulfilled" ? google.value : []),
    ...(openLibrary.status === "fulfilled" ? openLibrary.value : []),
  ];

  const vistos = new Set<string>();
  return combinados.filter((r) => {
    const clave = `${r.titulo.toLowerCase()}|${r.autor.toLowerCase()}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

export interface ResultadoBusquedaTitulo extends DatosComunidad {
  /** Si Google Books trae el ISBN de esa edición, para poder buscarlo bien y evitar duplicados. */
  isbn?: string;
}

/**
 * Busca libros por título/autor (texto libre) y devuelve varios candidatos
 * con sus datos completos, para elegir cuál cargar cuando no se tiene el
 * ISBN a mano.
 */
export async function buscarPorTitulo(
  consulta: string,
  idiomasLectura?: string[]
): Promise<ResultadoBusquedaTitulo[]> {
  const data = await consultarConIdiomas(
    { q: consulta, maxResults: "10" },
    idiomasLectura
  );

  const resultados: ResultadoBusquedaTitulo[] = [];
  for (const item of data.items ?? []) {
    const info = item.volumeInfo;
    if (!info?.title) continue;
    resultados.push({ ...mapVolumeInfo(info), isbn: extraerIsbn(info) });
  }
  return resultados;
}
