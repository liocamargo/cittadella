import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

const MAX_BYTES = 60 * 1024 * 1024;
const CONTENT_TYPE_POR_FORMATO = {
  epub: "application/epub+zip",
  pdf: "application/pdf",
} as const;

/**
 * El MIME type que reporta `file.type` no es confiable para EPUB: muchos
 * sistemas operativos (sobre todo Windows) no lo tienen registrado, así que
 * el navegador manda un `type` vacío aunque el archivo sea válido. Por eso
 * el formato se decide por extensión, no por `file.type`.
 */
function formatoPorExtension(nombre: string): "epub" | "pdf" | null {
  const extension = nombre.split(".").pop()?.toLowerCase();
  if (extension === "epub" || extension === "pdf") return extension;
  return null;
}

async function calcularSha256(file: File): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Sube un EPUB/PDF de un libro a Storage y devuelve sus metadatos para guardar en `Ebooks`. */
export async function subirArchivoLibro(
  bibliotecaId: string,
  ebookId: string,
  file: File
): Promise<{ formato: "epub" | "pdf"; storagePath: string; archivoUrl: string; sha256: string }> {
  const formato = formatoPorExtension(file.name);
  if (!formato) {
    throw new Error("El archivo tiene que ser un EPUB o un PDF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo no puede pesar más de 60 MB.");
  }

  const contentType = CONTENT_TYPE_POR_FORMATO[formato];
  const sha256 = await calcularSha256(file);
  const storagePath = `libros/${bibliotecaId}/${ebookId}.${formato}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType });
  const archivoUrl = await getDownloadURL(storageRef);

  return { formato, storagePath, archivoUrl, sha256 };
}
