import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const COL = "MetasLectura";

/** Objetivo personal de lectura del usuario (no es por biblioteca). */
export async function getMetaLectura(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, COL, uid));
  if (!snap.exists()) return 0;
  return (snap.data().objetivo as number) ?? 0;
}

export async function setMetaLectura(uid: string, objetivo: number): Promise<void> {
  await setDoc(doc(db, COL, uid), {
    objetivo,
    actualizadoEn: new Date().toISOString(),
  });
}
