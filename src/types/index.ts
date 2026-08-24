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
  /**
   * Hash MD5 de la clave de sincronización KOReader/KOSync. La clave en
   * texto plano nunca se guarda: se muestra una sola vez al generarla
   * (ver /api/kosync/clave) y este es el hash que el propio protocolo KOSync
   * manda en cada request para autenticarse.
   */
  claveSincronizacionHash?: string;
}

/** Documento en `Libros_Globales`, indexado por ISBN (doc id = isbn). */
export interface LibroGlobal {
  isbn: string;
  titulo: string;
  subtitulo?: string;
  autor: string;
  ilustrador?: string;
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
  /**
   * Claves canónicas de cada autor (normalizeString), para agrupar y buscar
   * sin ambigüedad de acentos/puntuación. Puede faltar en docs viejos.
   */
  autores_normalizados?: string[];
  /** Título como clave canónica (normalizeString). Puede faltar en docs viejos. */
  titulo_normalizado?: string;
  /** Id del doc en `Obras` que agrupa todas las ediciones de este libro. */
  obra_id?: string;
}

/**
 * Documento en `Obras/{obraId}`: la "obra maestra" que agrupa las distintas
 * ediciones (ISBNs) de un mismo libro, sea cual sea quien la escaneó.
 */
export interface Obra {
  id: string;
  titulo: string;
  /** Primer autor del array original, tal cual se muestra en la UI. */
  autorPrincipal: string;
  autores_normalizados: string[];
  titulo_normalizado: string;
  /** Todas las ediciones conocidas de esta obra. */
  isbns_asociados: string[];
  /** Suma de copias físicas de todas las ediciones de la obra. */
  propietarios: number;
  /** Promedio ponderado de `ratingPromedio` de todas las ediciones, por su `totalResenas`. */
  ratingPromedio: number;
  /** Suma de `totalResenas` de todas las ediciones de la obra. */
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
  /** Porcentaje de avance de lectura (0-100), independiente de `leido`. */
  progreso?: number;
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

/** Documento en `Ebooks/{ebookId}`: archivo digital (EPUB/PDF) de un libro de una biblioteca. */
export interface Ebook {
  id: string;
  bibliotecaId: string;
  isbn: string;
  formato: "epub" | "pdf";
  storagePath: string;
  archivoUrl: string;
  tamanio: number;
  sha256: string;
  agregadoPor: string;
  agregadoEn: string;
}

/**
 * Documento en `KosyncProgreso/{uid}_{document}`: progreso de lectura
 * reportado vía el protocolo KOSync de KOReader. `document` es el digest
 * opaco que KOReader calcula para identificar el archivo (no es el ISBN).
 */
export interface KosyncProgreso {
  id: string;
  uid: string;
  document: string;
  progress: string;
  percentage: number;
  device: string;
  deviceId: string;
  actualizadoEn: string;
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
