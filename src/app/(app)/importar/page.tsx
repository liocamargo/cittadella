"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import {
  agregarLibroABiblioteca,
  getLibroGlobal,
  listenInventario,
} from "@/lib/firestore/libros";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

interface FilaImportada {
  titulo: string;
  autor: string;
  editorial: string;
  anio: string;
  paginas: string;
  volumen: string;
  genero: string;
  idioma: string;
  isbn: string;
  estante: string;
  notas: string;
  favorito: boolean;
}

const COLUMNAS_RECONOCIDAS = [
  "Title",
  "titulo",
  "título",
  "Author",
  "autor",
  "Publisher",
  "editorial",
  "Published Date",
  "year",
  "anio",
  "año",
  "Pages",
  "paginas",
  "páginas",
  "Volume",
  "volumen",
  "tomo",
  "Genres",
  "Genre",
  "genero",
  "género",
  "Language",
  "idioma",
  "ISBN",
  "isbn",
  "BookShelf",
  "shelf",
  "estante",
  "Comments",
  "notas",
  "Favorite",
  "favorito",
  "Favorito",
];

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function mapearFila(row: Record<string, string>): FilaImportada {
  const fav = pick(row, ["Favorite", "favorito", "Favorito"]).toLowerCase();
  return {
    titulo: pick(row, ["Title", "titulo", "título"]),
    autor: pick(row, ["Author", "autor"]),
    editorial: pick(row, ["Publisher", "editorial"]),
    anio: pick(row, ["Published Date", "year", "anio", "año"]).slice(0, 4),
    paginas: pick(row, ["Pages", "paginas", "páginas"]),
    volumen: pick(row, ["Volume", "volumen", "tomo"]),
    genero: pick(row, ["Genres", "Genre", "genero", "género"]),
    idioma: pick(row, ["Language", "idioma"]),
    isbn: pick(row, ["ISBN", "isbn"]).replace(/[^0-9Xx]/g, ""),
    estante: pick(row, ["BookShelf", "shelf", "estante"]),
    notas: pick(row, ["Comments", "notas"]),
    favorito: fav === "true" || fav === "1" || fav === "yes" || fav === "sí" || fav === "si",
  };
}

function descargarArchivo(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportarPage() {
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [preview, setPreview] = useState<FilaImportada[] | null>(null);
  const [datosComunidad, setDatosComunidad] = useState<Record<string, LibroGlobal>>({});
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) return;
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);

  const isbnsExistentes = new Set(copias.map((c) => c.isbn));

  function handleExportar() {
    const filas = copias.map((c) => {
      const g = globales[c.isbn];
      return {
        titulo: g?.titulo ?? "",
        autor: g?.autor ?? "",
        editorial: g?.editorial ?? "",
        anio: g?.anio ?? "",
        volumen: g?.volumen ?? "",
        genero: g?.genero ?? "",
        isbn: c.isbn.startsWith("manual-") ? "" : c.isbn,
        estante: c.estante,
        estado: c.estado,
        prestado_a: c.prestadoA ?? "",
      };
    });
    descargarArchivo(
      `${bibliotecaActual?.nombre ?? "biblioteca"}.csv`,
      Papa.unparse(filas)
    );
  }

  function handleDescargarPlantilla() {
    descargarArchivo(
      "plantilla-cittadella.csv",
      Papa.unparse([
        {
          title: "",
          author: "",
          publisher: "",
          year: "",
          genre: "",
          volume: "",
          isbn: "",
          shelf: "",
        },
      ])
    );
  }

  function procesarArchivo(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Ese archivo no es un .csv.");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columnas = results.meta.fields ?? [];
        const reconoce = columnas.some((c) => COLUMNAS_RECONOCIDAS.includes(c.trim()));
        if (!reconoce) {
          toast.error(
            "No reconocemos las columnas de ese archivo. Esperamos algo como Title/Author/ISBN/Genres/BookShelf (HandyLib) o title/author/isbn/genre/shelf (plantilla propia)."
          );
          return;
        }
        const conTitulo = results.data.map(mapearFila).filter((f) => f.titulo);
        if (conTitulo.length === 0) {
          toast.error("No encontramos filas con título en ese archivo.");
          return;
        }
        const filas = conTitulo.filter((f) => f.isbn);
        const sinIsbn = conTitulo.length - filas.length;
        if (filas.length === 0) {
          toast.error(
            "Ninguna fila tiene ISBN. Todo libro necesita su ISBN para poder importarse."
          );
          return;
        }
        if (sinIsbn > 0) {
          toast.warning(
            `${sinIsbn} fila(s) sin ISBN se van a omitir (todo libro necesita su ISBN).`
          );
        }
        setPreview(filas);
        setDatosComunidad({});
        cargarDatosComunidad(filas);
      },
      error: (err) => {
        console.error("Error leyendo el CSV:", err);
        toast.error("No pudimos leer ese archivo.");
      },
    });
  }

  async function cargarDatosComunidad(filas: FilaImportada[]) {
    const isbnsUnicos = Array.from(new Set(filas.map((f) => f.isbn)));
    const encontrados: Record<string, LibroGlobal> = {};
    await Promise.all(
      isbnsUnicos.map(async (isbn) => {
        const libro = await getLibroGlobal(isbn);
        if (libro) encontrados[isbn] = libro;
      })
    );
    setDatosComunidad(encontrados);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  }

  async function handleConfirmarImport() {
    if (!bibliotecaActual || !preview) return;
    setImportando(true);
    setProgreso(0);
    let ok = 0;
    let omitidos = 0;
    let fallidos = 0;
    for (const fila of preview) {
      if (isbnsExistentes.has(fila.isbn)) {
        omitidos += 1;
        setProgreso((p) => p + 1);
        continue;
      }
      try {
        await agregarLibroABiblioteca(
          fila.isbn,
          bibliotecaActual.id,
          {
            titulo: fila.titulo,
            autor: fila.autor,
            editorial: fila.editorial || undefined,
            anio: fila.anio || undefined,
            paginas: fila.paginas || undefined,
            volumen: fila.volumen || undefined,
            idioma: fila.idioma || undefined,
            genero: fila.genero || undefined,
          },
          { estante: fila.estante, notas: fila.notas || undefined }
        );
        ok += 1;
      } catch (err) {
        console.error(`Error importando "${fila.titulo}" (ISBN ${fila.isbn}):`, err);
        fallidos += 1;
      }
      setProgreso((p) => p + 1);
    }
    setImportando(false);
    setPreview(null);
    const detalles = [
      omitidos > 0 && `${omitidos} ya estaban en tu biblioteca`,
      fallidos > 0 && `${fallidos} fallaron (mirá la consola del navegador)`,
    ].filter(Boolean);
    const detalle = detalles.length > 0 ? ` (${detalles.join(", ")})` : "";
    toast.success(`Se agregaron ${ok} de ${preview.length} libro(s)${detalle}.`);
  }

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-2xl font-bold">Importar / Exportar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Llevate tus datos a Excel o cargalos de golpe desde una planilla.
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Exportar biblioteca</div>
        <p className="mb-3 text-sm text-muted-foreground">
          Descarga un CSV con {copias.length} libro(s): título, autor, estado
          y a quién está prestado.
        </p>
        <Button variant="outline" onClick={handleExportar}>
          Descargar CSV
        </Button>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Importar desde Excel/CSV</div>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
            arrastrando && "border-foreground bg-muted/50"
          )}
        >
          <UploadCloud className="size-5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Arrastrá tu archivo .csv acá o hacé clic para elegirlo
          </div>
          <div className="font-mono text-[11px] text-muted-foreground/70">
            soporta plantilla propia o exportaciones de HandyLib
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <Button
          variant="outline"
          className="mt-2.5"
          onClick={handleDescargarPlantilla}
        >
          Descargar plantilla de Excel
        </Button>

        {preview && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-muted-foreground">
              {preview.length} fila(s) detectadas
            </div>
            <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border">
              {preview.slice(0, 30).map((f, i) => {
                const enComunidad = datosComunidad[f.isbn];
                const yaEnBiblioteca = isbnsExistentes.has(f.isbn);
                const titulo = enComunidad?.titulo || f.titulo;
                const autor = enComunidad?.autor || f.autor;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 border-b p-2.5 text-sm last:border-b-0"
                  >
                    <span className={cn(yaEnBiblioteca && "text-muted-foreground")}>
                      {titulo} — {autor}
                    </span>
                    {yaEnBiblioteca ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        ya en tu biblioteca
                      </span>
                    ) : (
                      enComunidad && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          ya en la comunidad
                        </span>
                      )
                    )}
                  </div>
                );
              })}
              {preview.length > 30 && (
                <div className="p-2.5 text-xs text-muted-foreground">
                  y {preview.length - 30} más…
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleConfirmarImport} disabled={importando}>
                {importando
                  ? `Importando ${progreso}/${preview.length}…`
                  : "Agregar al catálogo"}
              </Button>
              <Button
                variant="ghost"
                disabled={importando}
                onClick={() => setPreview(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
