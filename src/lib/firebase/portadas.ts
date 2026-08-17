import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

const MAX_BYTES = 5 * 1024 * 1024;

/** Sube una foto de portada tomada/elegida por el usuario y devuelve su URL pública. */
export async function subirPortada(isbn: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede pesar más de 5 MB.");
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const nombre = `${crypto.randomUUID()}.${extension}`;
  const storageRef = ref(storage, `portadas/${isbn || "manual"}/${nombre}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
