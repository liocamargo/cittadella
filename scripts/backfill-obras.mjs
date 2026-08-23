// Backfill único: recalcula los campos normalizados de todos los libros ya
// cargados en Libros_Globales y agrupa sus ediciones bajo Obras, en vez de
// esperar a que alguien vuelva a tocar cada ISBN (ver src/lib/firestore/libros.ts,
// que hace este mismo cálculo de forma perezosa en cada alta nueva).
//
// Uso: node scripts/backfill-obras.mjs [--dry-run]
//
// Reimplementa a propósito (sin importar desde src/) las mismas funciones de
// normalización de src/lib/firestore/libros.ts y src/lib/utils.ts, porque este
// script corre con `node` plano (sin el bundler de Next ni el alias "@/").
// Si esas funciones cambian, hay que actualizar también estas copias.

import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

function normalizarBusqueda(valor) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function normalizeString(text) {
  return normalizarBusqueda(text)
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function normalizarAutores(autor) {
  return autor
    .split(",")
    .map((a) => normalizeString(a))
    .filter(Boolean);
}

const CONECTORES_AUTOR = new Set(["y", "and", "e"]);

function claveAutorObra(autor) {
  const tokens = normalizeString(autor)
    .split("_")
    .filter((t) => t && !CONECTORES_AUTOR.has(t));
  return [...new Set(tokens)].sort().join("_");
}

const RUIDO_TITULO = new Set([
  "edicion", "ilustrada", "ilustrado", "especial", "revisada", "revisado",
  "aniversario", "definitiva", "definitivo", "conmemorativa", "conmemorativo",
  "tapa", "dura", "blanda", "bolsillo", "coleccionista", "deluxe",
]);

function claveTituloObra(titulo) {
  const sinAclaraciones = titulo.replace(/[([][^)\]]*[)\]]/g, " ");
  return normalizeString(sinAclaraciones)
    .split("_")
    .filter((t) => t && !RUIDO_TITULO.has(t))
    .join("_");
}

function generarObraId(titulo, autor) {
  return [claveTituloObra(titulo), claveAutorObra(autor)].filter(Boolean).join("__");
}

function getAdminDb() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY en .env.local."
    );
  }
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore(app);
}

async function commitEnLotes(db, operaciones) {
  const TAMANO_LOTE = 400;
  for (let i = 0; i < operaciones.length; i += TAMANO_LOTE) {
    const lote = db.batch();
    for (const op of operaciones.slice(i, i + TAMANO_LOTE)) op(lote);
    if (!DRY_RUN) await lote.commit();
  }
}

async function main() {
  const db = getAdminDb();

  const globalesSnap = await db.collection("Libros_Globales").get();
  console.log(`Libros_Globales: ${globalesSnap.size} documentos.`);

  const porObra = new Map();
  const actualizacionesGlobales = [];
  let sinObra = 0;

  for (const doc of globalesSnap.docs) {
    const isbn = doc.id;
    const data = doc.data();
    const titulo = (data.titulo ?? "").trim();
    const autor = (data.autor ?? "").trim();
    const obraId = generarObraId(titulo, autor);

    if (!obraId) {
      sinObra += 1;
      continue;
    }

    const derivados = {
      titulo_normalizado: normalizeString(titulo),
      autores_normalizados: normalizarAutores(autor),
      obra_id: obraId,
    };
    actualizacionesGlobales.push({ ref: doc.ref, derivados });

    const entrada = {
      isbn,
      titulo,
      autor,
      propietarios: data.propietarios ?? 0,
      ratingPromedio: data.ratingPromedio ?? 0,
      totalResenas: data.totalResenas ?? 0,
      titulo_normalizado: derivados.titulo_normalizado,
      autores_normalizados: derivados.autores_normalizados,
    };
    const grupo = porObra.get(obraId);
    if (grupo) grupo.push(entrada);
    else porObra.set(obraId, [entrada]);
  }

  console.log(`Sin título/autor (se omiten): ${sinObra}.`);
  console.log(`Obras resultantes: ${porObra.size}.`);

  const obrasNuevas = new Map();
  for (const [obraId, ediciones] of porObra) {
    const representativa = [...ediciones].sort(
      (a, b) => b.propietarios - a.propietarios
    )[0];
    const propietarios = ediciones.reduce((s, e) => s + e.propietarios, 0);
    const totalResenas = ediciones.reduce((s, e) => s + e.totalResenas, 0);
    const sumaPonderada = ediciones.reduce(
      (s, e) => s + e.ratingPromedio * e.totalResenas,
      0
    );
    const ratingPromedio = totalResenas
      ? Math.round((sumaPonderada / totalResenas) * 10) / 10
      : 0;

    obrasNuevas.set(obraId, {
      titulo: representativa.titulo,
      autorPrincipal: representativa.autor.split(",")[0].trim(),
      titulo_normalizado: representativa.titulo_normalizado,
      autores_normalizados: representativa.autores_normalizados,
      isbns_asociados: ediciones.map((e) => e.isbn),
      propietarios,
      ratingPromedio,
      totalResenas,
    });

    if (ediciones.length > 1) {
      console.log(
        `  · "${representativa.titulo}" — ${ediciones.length} ediciones unificadas (${ediciones
          .map((e) => e.isbn)
          .join(", ")})`
      );
    }
  }

  const obrasSnap = await db.collection("Obras").get();
  const huerfanas = obrasSnap.docs.filter((d) => !obrasNuevas.has(d.id));
  console.log(`Obras existentes: ${obrasSnap.size}. Huérfanas a borrar: ${huerfanas.length}.`);

  const operaciones = [
    ...actualizacionesGlobales.map(({ ref, derivados }) => (lote) => lote.update(ref, derivados)),
    ...Array.from(obrasNuevas, ([obraId, data]) => (lote) =>
      lote.set(db.collection("Obras").doc(obraId), data)
    ),
    ...huerfanas.map((d) => (lote) => lote.delete(d.ref)),
  ];

  console.log(
    DRY_RUN
      ? `[dry-run] Se aplicarían ${operaciones.length} operaciones. No se escribió nada.`
      : `Aplicando ${operaciones.length} operaciones...`
  );
  await commitEnLotes(db, operaciones);
  console.log(DRY_RUN ? "Listo (dry-run)." : "Listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
