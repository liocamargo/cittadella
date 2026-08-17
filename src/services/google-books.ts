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

/** Busca un ISBN en Google Books y devuelve los datos ya mapeados a nuestro modelo. */
export async function buscarPorIsbn(isbn: string): Promise<DatosComunidad | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams({ q: `isbn:${isbn}` });
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`
  );
  if (!res.ok) {
    throw new GoogleBooksError(`Google Books respondió ${res.status}`, res.status);
  }
  const data: GoogleBooksResponse = await res.json();
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

export interface ResultadoPortada {
  titulo: string;
  autor: string;
  portadaUrl: string;
}

/** Busca por título/autor y devuelve varias portadas candidatas para elegir. */
export async function buscarPortadas(consulta: string): Promise<ResultadoPortada[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const params = new URLSearchParams({ q: consulta, maxResults: "12" });
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`
  );
  if (!res.ok) {
    throw new GoogleBooksError(`Google Books respondió ${res.status}`, res.status);
  }
  const data: GoogleBooksResponse = await res.json();

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
