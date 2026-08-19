import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { quitarMiembro } from "@/lib/firestore/bibliotecas";
import type { Biblioteca } from "@/types";

async function borrarColeccionPorCampo(coleccion: string, campo: string, valor: string) {
  const snap = await getDocs(query(collection(db, coleccion), where(campo, "==", valor)));
  await Promise.allSettled(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Borra todos los datos de una cuenta en Firestore (perfil, objetivo de
 * lectura, lecturas, y su lugar en cada biblioteca). Si la persona es la
 * única integrante de una biblioteca, borra la biblioteca entera (copias y
 * socios incluidos); si la comparte con alguien más, solo se la quita a
 * ella. No borra el usuario de Firebase Auth — eso lo hace el llamador por
 * separado, porque puede requerir un login reciente.
 */
export async function eliminarDatosDeCuenta(
  uid: string,
  bibliotecas: Biblioteca[]
): Promise<void> {
  for (const b of bibliotecas) {
    const esUnicaMiembro = b.miembrosUids.length === 1 && b.miembrosUids[0] === uid;
    if (esUnicaMiembro) {
      await borrarColeccionPorCampo("Libros_En_Biblioteca", "bibliotecaId", b.id);
      await borrarColeccionPorCampo("Socios", "bibliotecaId", b.id);
      await borrarColeccionPorCampo("HistorialPrestamos", "bibliotecaId", b.id);
      await deleteDoc(doc(db, "Bibliotecas", b.id));
    } else {
      await quitarMiembro(b.id, uid);
    }
  }

  await borrarColeccionPorCampo("Lecturas", "uid", uid);
  await deleteDoc(doc(db, "MetasLectura", uid)).catch(() => {});
  await deleteDoc(doc(db, "Perfiles", uid)).catch(() => {});
}
