import type { Locale } from "@/i18n/config";

/** Documento en `Perfiles/{uid}`: preferencias personales del usuario. */
export interface Perfil {
  uid: string;
  /** Idioma en que se muestran los textos de la aplicación. */
  idiomaUI: Locale;
  /** Idiomas que se priorizan al buscar libros (Google Books), en orden. */
  idiomaLectura: Locale[];
  /** Géneros favoritos, elegidos en Mi cuenta. */
  generosFavoritos: string[];
}

/** Documento en `Libros_Globales`, indexado por ISBN (doc id = isbn). */
export interface LibroGlobal {
  isbn: string;
  titulo: string;
  subtitulo?: string;
  autor: string;
  editorial?: string;
  anio?: string;
  paginas?: string;
  volumen?: string;
  idioma?: string;
  genero?: string;
  sinopsis?: string;
  portadaUrl?: string;
  /** Link de vista previa en Google Books, si esa edición tiene una disponible. */
  previewLink?: string;
  propietarios: number;
  ratingPromedio: number;
  totalResenas: number;
}

/** Subcolección `Libros_Globales/{isbn}/resenas/{resenaId}`. */
export interface Resena {
  id: string;
  usuarioUid: string;
  usuarioNombre: string;
  estrellas: number;
  comentario: string;
  creadoEn: string;
}

export type EstadoCopia = "disponible" | "prestado";

/** Documento en `Libros_En_Biblioteca`: el inventario físico de una biblioteca. */
export interface LibroEnBiblioteca {
  id: string;
  bibliotecaId: string;
  isbn: string;
  estante: string;
  tipoTapa?: string;
  notas?: string;
  estado: EstadoCopia;
  prestadoA?: string;
  /** Si el préstamo es a un socio registrado (modo socios), su id. */
  prestadoASocioId?: string;
  /** Doc id en HistorialPrestamos del préstamo en curso, para cerrarlo al devolver. */
  historialActivoId?: string;
  fechaPrestamo?: string;
  fechaLimite?: string;
  favorito: boolean;
  leido: boolean;
  fechaAgregado: string;
}

/** Documento en `Bibliotecas`: el espacio colaborativo. */
export interface Biblioteca {
  id: string;
  nombre: string;
  miembrosUids: string[];
  /** Emails invitados que todavía no se loguearon nunca; se resuelven a uid al primer login. */
  invitacionesPendientes: string[];
  /** uid -> nombre para mostrar (editable desde "Espacio compartido"). */
  nombresMiembros: Record<string, string>;
  /** uid -> email, para mostrar en "Espacio compartido". */
  emailsMiembros: Record<string, string>;
  /** uid -> WhatsApp (solo dígitos, con código de país), opcional. */
  whatsappMiembros: Record<string, string>;
  /** Estantes declarados explícitamente (pueden existir sin libros todavía). */
  estantes: string[];
  /** Si es true, el catálogo se puede ver (solo lectura) sin login en /compartido/{id}. */
  catalogoPublico: boolean;
  /**
   * Si es true, los préstamos se asignan a socios registrados (colección
   * Socios) en vez de anotar un nombre libre. No conviven los dos modos.
   */
  modoSocios: boolean;
  creadaPor: string;
  creadaEn: string;
}

/** Documento en `Socios`: base de socios de una biblioteca (modo socios). */
export interface Socio {
  id: string;
  bibliotecaId: string;
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
  creadoEn: string;
}

/** Documento en `HistorialPrestamos`: registro histórico de cada préstamo. */
export interface HistorialPrestamo {
  id: string;
  bibliotecaId: string;
  copiaId: string;
  isbn: string;
  /** uid del socio si el préstamo se hizo en modo socios. */
  socioId?: string;
  /** Nombre de a quién se le prestó (socio o texto libre), para mostrar. */
  prestadoA: string;
  fechaPrestamo: string;
  fechaLimite?: string;
  /** Se completa recién cuando se devuelve el libro. */
  fechaDevolucion?: string;
}
