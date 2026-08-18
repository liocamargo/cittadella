import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Biblioteca } from "@/types";

const COL = "Bibliotecas";

function toBiblioteca(id: string, data: Record<string, unknown>): Biblioteca {
  return {
    id,
    nombre: (data.nombre as string) ?? "",
    miembrosUids: (data.miembrosUids as string[]) ?? [],
    invitacionesPendientes: (data.invitacionesPendientes as string[]) ?? [],
    nombresMiembros: (data.nombresMiembros as Record<string, string>) ?? {},
    emailsMiembros: (data.emailsMiembros as Record<string, string>) ?? {},
    whatsappMiembros: (data.whatsappMiembros as Record<string, string>) ?? {},
    estantes: (data.estantes as string[]) ?? [],
    catalogoPublico: Boolean(data.catalogoPublico),
    modoSocios: Boolean(data.modoSocios),
    creadaPor: (data.creadaPor as string) ?? "",
    creadaEn: (data.creadaEn as string) ?? "",
  };
}

/** Escucha una biblioteca puntual por id (usado por la página pública /compartido). */
export function listenBiblioteca(
  bibliotecaId: string,
  onChange: (biblioteca: Biblioteca | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COL, bibliotecaId),
    (snap) => onChange(snap.exists() ? toBiblioteca(snap.id, snap.data()) : null),
    () => onChange(null)
  );
}

export function listenBibliotecasDeUsuario(
  uid: string,
  onChange: (bibliotecas: Biblioteca[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), where("miembrosUids", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toBiblioteca(d.id, d.data())));
  });
}

export async function crearBiblioteca(
  nombre: string,
  uid: string,
  nombreMiembro: string,
  email: string
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    nombre,
    miembrosUids: [uid],
    invitacionesPendientes: [],
    nombresMiembros: { [uid]: nombreMiembro },
    emailsMiembros: { [uid]: email },
    whatsappMiembros: {},
    estantes: [],
    catalogoPublico: false,
    modoSocios: false,
    creadaPor: uid,
    creadaEn: new Date().toISOString(),
  });
  return ref.id;
}

/** Se corre una vez al loguearse: une al usuario a cualquier biblioteca que lo esté esperando. */
export async function aceptarInvitacionesPendientes(
  uid: string,
  email: string,
  nombre: string
): Promise<void> {
  const q = query(
    collection(db, COL),
    where("invitacionesPendientes", "array-contains", email)
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(doc(db, COL, d.id), {
        miembrosUids: arrayUnion(uid),
        invitacionesPendientes: arrayRemove(email),
        [`nombresMiembros.${uid}`]: nombre,
        [`emailsMiembros.${uid}`]: email,
      })
    )
  );
}

export async function invitarMiembro(bibliotecaId: string, email: string) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    invitacionesPendientes: arrayUnion(email),
  });
}

export async function cancelarInvitacion(bibliotecaId: string, email: string) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    invitacionesPendientes: arrayRemove(email),
  });
}

export async function quitarMiembro(bibliotecaId: string, uid: string) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    miembrosUids: arrayRemove(uid),
    [`nombresMiembros.${uid}`]: deleteField(),
    [`emailsMiembros.${uid}`]: deleteField(),
    [`whatsappMiembros.${uid}`]: deleteField(),
  });
}

export async function renombrarMiembro(
  bibliotecaId: string,
  uid: string,
  nombre: string
) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    [`nombresMiembros.${uid}`]: nombre,
  });
}

/** WhatsApp del miembro (solo dígitos, con código de país) para pedidos desde el catálogo público. */
export async function actualizarWhatsappMiembro(
  bibliotecaId: string,
  uid: string,
  whatsapp: string
) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    [`whatsappMiembros.${uid}`]: whatsapp.trim() ? whatsapp.trim() : deleteField(),
  });
}

export async function agregarEstante(bibliotecaId: string, nombre: string) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    estantes: arrayUnion(nombre),
  });
}

export async function eliminarEstante(bibliotecaId: string, nombre: string) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    estantes: arrayRemove(nombre),
  });
}

export async function setCatalogoPublico(bibliotecaId: string, activo: boolean) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    catalogoPublico: activo,
  });
}

/** Modo socios y modo libre no conviven: prender uno no borra los préstamos
 * ya anotados con el otro modo, pero cambia cómo se cargan los nuevos. */
export async function setModoSocios(bibliotecaId: string, activo: boolean) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    modoSocios: activo,
  });
}

export async function renombrarEstante(
  bibliotecaId: string,
  anterior: string,
  nuevo: string
) {
  await updateDoc(doc(db, COL, bibliotecaId), {
    estantes: arrayRemove(anterior),
  });
  await updateDoc(doc(db, COL, bibliotecaId), {
    estantes: arrayUnion(nuevo),
  });
}
