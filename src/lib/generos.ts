/** Lista predeterminada de géneros literarios para catalogar libros. */
export const GENEROS = [
  "Novela",
  "Cuento",
  "Poesía",
  "Teatro",
  "Ensayo",
  "Biografía",
  "Historia",
  "Filosofía",
  "Ciencia",
  "Ciencia ficción",
  "Fantasía",
  "Terror",
  "Policial / Thriller",
  "Romance",
  "Aventura",
  "Infantil",
  "Juvenil",
  "Cómic / Novela gráfica",
  "Autoayuda",
  "Arte",
  "Viajes",
  "Cocina",
  "Otro",
] as const;

export type Genero = (typeof GENEROS)[number];
