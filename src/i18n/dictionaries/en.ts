import type { Dictionary } from "./es";

const en: Dictionary = {
  common: {
    cargando: "Loading…",
    crear: "Create",
    cancelar: "Cancel",
    guardar: "Save",
  },
  nav: {
    inicio: "Home",
    catalogo: "Catalog",
    leidos: "Read",
    prestamos: "Loans",
    espacio: "Space",
    importar: "Import/Export",
    socios: "Members",
    miCuenta: "My account",
    espacioCompartido: "Shared space",
    nuevaBiblioteca: "New library",
    bibliotecaCreada: "Library created.",
    errorCreandoBiblioteca: "We couldn't create the library.",
    cerrarSesion: "Log out",
  },
  login: {
    subtitulo: "Your library's shared catalog",
    continuarGoogle: "Continue with Google",
    oConCorreo: "or with your email",
    placeholderCorreo: "you@email.com",
    enviarLink: "Send access link",
    linkEnviadoA: "We sent an access link to",
    abrirDesdeDispositivo: "Open it on this device to sign in.",
    volver: "Back",
    ingresando: "Signing in…",
    confirmarCorreo: "Confirm your email to finish signing in.",
    correo: "Email",
    ingresar: "Sign in",
    errorGoogle: "We couldn't sign in with Google.",
    errorCorreoVacio: "Enter your email.",
    errorEnviandoLink: "We couldn't send the link. Try again.",
    errorCompletando: "We couldn't complete sign-in. Try again.",
    errorCorreoConfirmVacio: "Enter your email to confirm.",
    errorLinkInvalido: "The link is invalid or expired. Request a new one.",
  },
  cuenta: {
    titulo: "My account",
    subtitulo: "Personal language preferences.",
    idiomaPagina: "Page language",
    idiomaPaginaDesc: "The language the app's text is shown in.",
    idiomaLectura: "Language I read in",
    idiomaLecturaDesc:
      "Used to prioritize Google Books results in that language when searching for a book.",
    guardado: "Preferences saved.",
    errorGuardando: "We couldn't save your preferences.",
    conectadoComo: "Signed in as",
  },
};

export default en;
