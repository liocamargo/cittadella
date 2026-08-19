const PREFIJO = "[Cittadella]";

function esFirebaseError(err: unknown): err is { code: string; message: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

function explicarCodigo(code: string): string | null {
  switch (code) {
    case "permission-denied":
      return (
        "Firestore rechazó el permiso. Esto casi siempre significa que " +
        "firestore.rules en el proyecto de Firebase (Console → Firestore " +
        "Database → Reglas) todavía no tiene el permiso necesario, o que " +
        "hay cambios en el repo sin deployar. Deployalas con " +
        "`npm run firebase:rules:deploy` (después de `npm run " +
        "firebase:login`), o pegá el contenido de firestore.rules a mano " +
        "en la consola de Firebase."
      );
    case "auth/requires-recent-login":
      return (
        "Firebase pide un login reciente para esta operación sensible. " +
        "Cerrá sesión, volvé a entrar, e intentá de nuevo enseguida."
      );
    case "resource-exhausted":
      return "Se alcanzó un límite de cuota (Firestore o Google Books). Esperá un momento y probá de nuevo.";
    case "unavailable":
      return "No se pudo conectar con Firebase (¿sin internet?). Probá de nuevo.";
    default:
      return null;
  }
}

/**
 * Log de error enriquecido para la consola del navegador: agrupa el error
 * original con una explicación en criollo del código de Firebase (si
 * aplica), para que se entienda de un vistazo qué pasó y qué hacer.
 */
export function logError(mensaje: string, err: unknown): void {
  console.groupCollapsed(`🔴 ${PREFIJO} ${mensaje}`);
  console.error(err);
  if (esFirebaseError(err)) {
    console.log("Código:", err.code);
    const explicacion = explicarCodigo(err.code);
    if (explicacion) console.warn(`💡 ${explicacion}`);
  }
  console.groupEnd();
}

/** Log de éxito, para confirmar en la consola que una operación terminó bien. */
export function logSuccess(mensaje: string, datos?: unknown): void {
  if (datos !== undefined) {
    console.log(`✅ ${PREFIJO} ${mensaje}`, datos);
  } else {
    console.log(`✅ ${PREFIJO} ${mensaje}`);
  }
}
