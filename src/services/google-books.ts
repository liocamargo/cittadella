import type { DatosComunidad } from "@/lib/firestore/libros";

interface GoogleBooksVolume {
  volumeInfo?: {
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
  };
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

/** Una consulta puntual a la API de Google Books, con langRestrict opcional. */
async function consultarGoogleBooks(
  query: Record<string, string>,
  idiomaLectura?: string
): Promise<GoogleBooksResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams(query);
  if (apiKey) params.set("key", apiKey);
  if (idiomaLectura) params.set("langRestrict", idiomaLectura);

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`
  );
  if (!res.ok) {
    throw new GoogleBooksError(`Google Books respondió ${res.status}`, res.status);
  }
  return res.json();
}

/**
 * Busca un ISBN en Google Books. Si se pasa idiomaLectura, intenta primero
 * priorizando ese idioma; si no encuentra nada así (el langRestrict de
 * Google puede dejar afuera la única edición que existe), reintenta sin
 * restricción antes de darse por vencido. Tira GoogleBooksError si la
 * consulta en sí falla (red, cuota).
 */
async function buscarPorIsbnGoogle(
  isbn: string,
  idiomaLectura?: string
): Promise<DatosComunidad | null> {
  const query = { q: `isbn:${isbn}` };
  let data = await consultarGoogleBooks(query, idiomaLectura);
  if (!data.items?.length && idiomaLectura) {
    data = await consultarGoogleBooks(query);
  }
  const info = data.items?.[0]?.volumeInfo;
  if (!info) return null;

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
  };
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
    console.error("Error consultando Open Library:", err);
    return null;
  }
}

/**
 * Busca un ISBN en Google Books; si falla (cuota, red) o no lo encuentra,
 * cae automáticamente a Open Library antes de rendirse.
 */
export async function buscarPorIsbn(
  isbn: string,
  idiomaLectura?: string
): Promise<DatosComunidad | null> {
  try {
    const google = await buscarPorIsbnGoogle(isbn, idiomaLectura);
    if (google) return google;
  } catch (err) {
    console.error("Google Books falló, probamos Open Library:", err);
  }
  return buscarPorIsbnOpenLibrary(isbn);
}

export interface ResultadoPortada {
  titulo: string;
  autor: string;
  portadaUrl: string;
}

/** Busca por título/autor y devuelve varias portadas candidatas para elegir. */
export async function buscarPortadas(
  consulta: string,
  idiomaLectura?: string
): Promise<ResultadoPortada[]> {
  const query = { q: consulta, maxResults: "12" };
  let data = await consultarGoogleBooks(query, idiomaLectura);
  if (!data.items?.length && idiomaLectura) {
    data = await consultarGoogleBooks(query);
  }

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
