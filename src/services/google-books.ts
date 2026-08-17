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

/** Busca un ISBN en Google Books y devuelve los datos ya mapeados a nuestro modelo. */
export async function buscarPorIsbn(isbn: string): Promise<DatosComunidad | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Books respondió ${res.status}`);
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
