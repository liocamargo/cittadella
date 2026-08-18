import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Locale } from "@/i18n/config";
import { LOCALE_POR_DEFECTO } from "@/i18n/config";
import type { Perfil } from "@/types";

const COL = "Perfiles";

function toPerfil(uid: string, data: Record<string, unknown> | undefined): Perfil {
  return {
    uid,
    idiomaUI: (data?.idiomaUI as Locale) ?? LOCALE_POR_DEFECTO,
    idiomaLectura: (data?.idiomaLectura as Locale) ?? LOCALE_POR_DEFECTO,
  };
}

/** Escucha el perfil del usuario; onChange(null) si todavía no existe el doc. */
export function listenPerfil(
  uid: string,
  onChange: (perfil: Perfil | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COL, uid),
    (snap) => onChange(snap.exists() ? toPerfil(uid, snap.data()) : null),
    () => onChange(null)
  );
}

export async function guardarPerfil(
  uid: string,
  datos: Partial<Pick<Perfil, "idiomaUI" | "idiomaLectura">>
): Promise<void> {
  await setDoc(doc(db, COL, uid), datos, { merge: true });
}
