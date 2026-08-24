import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Verifica las credenciales que manda KOReader (protocolo KOSync) por
 * headers `x-auth-user` / `x-auth-key`. `username` es el uid de Firebase del
 * usuario; `x-auth-key` es el MD5 de la clave generada desde "Mi cuenta"
 * (ver /api/kosync/clave), que es lo único que se persiste en
 * `Perfil.claveSincronizacionHash`.
 */
export async function verificarCredencialesKosync(
  request: Request
): Promise<{ uid: string } | null> {
  const uid = request.headers.get("x-auth-user");
  const claveMd5 = request.headers.get("x-auth-key")?.toLowerCase();
  if (!uid || !claveMd5) return null;

  const perfilSnap = await getAdminDb().collection("Perfiles").doc(uid).get();
  const hashGuardado = perfilSnap.data()?.claveSincronizacionHash as string | undefined;
  if (!hashGuardado || hashGuardado !== claveMd5) return null;
  return { uid };
}
