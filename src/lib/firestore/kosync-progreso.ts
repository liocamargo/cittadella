import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { KosyncProgreso } from "@/types";

const COL = "KosyncProgreso";

function toKosyncProgreso(id: string, data: Record<string, unknown>): KosyncProgreso {
  return {
    id,
    uid: (data.uid as string) ?? "",
    document: (data.document as string) ?? "",
    progress: (data.progress as string) ?? "",
    percentage: (data.percentage as number) ?? 0,
    device: (data.device as string) ?? "",
    deviceId: (data.deviceId as string) ?? "",
    actualizadoEn: (data.actualizadoEn as string) ?? "",
  };
}

/** Progreso de lectura reportado vía KOSync (KOReader) para el usuario. */
export function listenProgresoKosync(
  uid: string,
  onChange: (progresos: KosyncProgreso[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toKosyncProgreso(d.id, d.data())));
  });
}
