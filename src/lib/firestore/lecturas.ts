import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const COL = "Lecturas";

export interface Lectura {
  id: string;
  uid: string;
  isbn: string;
  fechaLeido: string;
  /** Porcentaje de avance de lectura (0-100). */
  progreso?: number;
}

function toLectura(id: string, data: Record<string, unknown>): Lectura {
  return {
    id,
    uid: (data.uid as string) ?? "",
    isbn: (data.isbn as string) ?? "",
    fechaLeido: (data.fechaLeido as string) ?? "",
    progreso: typeof data.progreso === "number" ? data.progreso : undefined,
  };
}

/** Libros que el usuario marcó como leídos, sea que los tenga en su biblioteca o no. */
export function listenLecturas(
  uid: string,
  onChange: (lecturas: Lectura[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toLectura(d.id, d.data())));
  });
}

export async function quitarLectura(uid: string, isbn: string): Promise<void> {
  await deleteDoc(doc(db, COL, `${uid}_${isbn}`));
}

export async function actualizarProgresoLectura(
  uid: string,
  isbn: string,
  progreso: number
): Promise<void> {
  await updateDoc(doc(db, COL, `${uid}_${isbn}`), { progreso });
}
