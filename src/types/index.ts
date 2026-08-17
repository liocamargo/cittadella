/** Documento en `Libros_Globales`, indexado por ISBN (doc id = isbn). */
export interface LibroGlobal {
  isbn: string;
  titulo: string;
  subtitulo?: string;
  autor: string;
  editorial?: string;
  anio?: string;
  paginas?: string;
  idioma?: string;
  genero?: string;
  sinopsis?: string;
  portadaUrl?: string;
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
  /** Estantes declarados explícitamente (pueden existir sin libros todavía). */
  estantes: string[];
  creadaPor: string;
  creadaEn: string;
}
