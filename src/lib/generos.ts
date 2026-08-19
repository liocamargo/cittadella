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

/**
 * Frases divertidas para mostrar en vez del nombre del género (usado en el
 * onboarding, para que elegir géneros favoritos sea más ameno). El valor
 * que se guarda sigue siendo el nombre real del género.
 */
export const GENERO_FRASES: Record<Genero, string> = {
  Novela: "📚 Me pierdo horas leyendo",
  Cuento: "🎯 Prefiero las historias cortas y contundentes",
  Poesía: "✨ Me gusta que las palabras duelan lindo",
  Teatro: "🎭 Me imagino todo como una obra",
  Ensayo: "🧠 Me gusta que me hagan pensar",
  Biografía: "👤 Quiero meterme en la vida de otros",
  Historia: "⏳ Viajo en el tiempo leyendo",
  Filosofía: "🤔 Pregunto el porqué de todo",
  Ciencia: "🔬 Quiero entender cómo funciona el mundo",
  "Ciencia ficción": "🚀 Ya vivo un poco en el futuro",
  Fantasía: "🐉 Creo en los mundos que no existen",
  Terror: "👻 Duermo con la luz prendida después de leer",
  "Policial / Thriller": "🕵️ Sospecho de todos los personajes",
  Romance: "❤️ Lloro con los finales felices",
  Aventura: "🗺️ Necesito acción en cada página",
  Infantil: "🧸 Nunca crecí del todo",
  Juvenil: "🎒 Todavía tengo mucho drama adolescente",
  "Cómic / Novela gráfica": "💥 Prefiero que me lo dibujen",
  Autoayuda: "🌱 Estoy laburando en ser mejor",
  Arte: "🎨 Me quedo mirando las imágenes",
  Viajes: "✈️ Leo para viajar sin salir de casa",
  Cocina: "🍳 Leo recetas como si fueran cuentos",
  Otro: "🤷 Ninguna de las anteriores me define",
};
