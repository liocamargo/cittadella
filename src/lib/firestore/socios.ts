import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Socio } from "@/types";

const COL = "Socios";

function toSocio(id: string, data: Record<string, unknown>): Socio {
  return {
    id,
    bibliotecaId: (data.bibliotecaId as string) ?? "",
    nombre: (data.nombre as string) ?? "",
    telefono: data.telefono as string | undefined,
    email: data.email as string | undefined,
    notas: data.notas as string | undefined,
    creadoEn: (data.creadoEn as string) ?? "",
  };
}

export function listenSocios(
  bibliotecaId: string,
  onChange: (socios: Socio[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("bibliotecaId", "==", bibliotecaId));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs
        .map((d) => toSocio(d.id, d.data()))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
  });
}

export interface DatosSocio {
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export async function crearSocio(
  bibliotecaId: string,
  datos: DatosSocio
): Promise<string> {
  const ref = doc(collection(db, COL));
  await setDoc(ref, {
    bibliotecaId,
    nombre: datos.nombre,
    telefono: datos.telefono || undefined,
    email: datos.email || undefined,
    notas: datos.notas || undefined,
    creadoEn: new Date().toISOString(),
  });
  return ref.id;
}

export async function actualizarSocio(
  socioId: string,
  datos: DatosSocio
): Promise<void> {
  await updateDoc(doc(db, COL, socioId), {
    nombre: datos.nombre,
    telefono: datos.telefono || undefined,
    email: datos.email || undefined,
    notas: datos.notas || undefined,
  });
}

export async function eliminarSocio(socioId: string): Promise<void> {
  await deleteDoc(doc(db, COL, socioId));
}
