import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const COL = "Deseos";

export interface Deseo {
  id: string;
  uid: string;
  isbn: string;
  fechaAgregado: string;
}

function toDeseo(id: string, data: Record<string, unknown>): Deseo {
  return {
    id,
    uid: (data.uid as string) ?? "",
    isbn: (data.isbn as string) ?? "",
    fechaAgregado: (data.fechaAgregado as string) ?? "",
  };
}

/** Libros que el usuario quiere conseguir, sea que los tenga en su biblioteca o no. */
export function listenDeseos(
  uid: string,
  onChange: (deseos: Deseo[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toDeseo(d.id, d.data())));
  });
}

export async function quitarDeseo(uid: string, isbn: string): Promise<void> {
  await deleteDoc(doc(db, COL, `${uid}_${isbn}`));
}
