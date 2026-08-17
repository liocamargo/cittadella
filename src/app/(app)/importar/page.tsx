"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { agregarLibroABiblioteca, listenInventario } from "@/lib/firestore/libros";
import type { LibroEnBiblioteca } from "@/types";

interface FilaImportada {
  titulo: string;
  autor: string;
  editorial: string;
  anio: string;
  paginas: string;
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
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) return;
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);

  const titulosExistentes = new Set(
    copias
      .map((c) => globales[c.isbn]?.titulo?.trim().toLowerCase())
      .filter((t): t is string => Boolean(t))
  );

  function handleExportar() {
    const filas = copias.map((c) => {
      const g = globales[c.isbn];
      return {
        titulo: g?.titulo ?? "",
        autor: g?.autor ?? "",
        editorial: g?.editorial ?? "",
        anio: g?.anio ?? "",
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
        { title: "", author: "", publisher: "", year: "", genre: "", isbn: "", shelf: "" },
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
        const filas = results.data.map(mapearFila).filter((f) => f.titulo);
        if (filas.length === 0) {
          toast.error("No encontramos filas con título en ese archivo.");
          return;
        }
        setPreview(filas);
      },
      error: () => toast.error("No pudimos leer ese archivo."),
    });
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
    for (const fila of preview) {
      if (titulosExistentes.has(fila.titulo.trim().toLowerCase())) {
        omitidos += 1;
        setProgreso((p) => p + 1);
        continue;
      }
      try {
        const isbn = fila.isbn || `manual-${crypto.randomUUID()}`;
        await agregarLibroABiblioteca(
          isbn,
          bibliotecaActual.id,
          {
            titulo: fila.titulo,
            autor: fila.autor,
            editorial: fila.editorial || undefined,
            anio: fila.anio || undefined,
            paginas: fila.paginas || undefined,
            idioma: fila.idioma || undefined,
            genero: fila.genero || undefined,
          },
          { estante: fila.estante, notas: fila.notas || undefined }
        );
        ok += 1;
      } catch {
        // seguimos con las demás filas
      }
      setProgreso((p) => p + 1);
    }
    setImportando(false);
    setPreview(null);
    const detalle = omitidos > 0 ? ` (${omitidos} ya estaban en tu biblioteca)` : "";
    toast.success(`Se agregaron ${ok} de ${preview.length} libro(s)${detalle}.`);
  }

  return (
    <div className="flex max-w-xl flex-col gap-9">
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
                const duplicado = titulosExistentes.has(f.titulo.trim().toLowerCase());
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 border-b p-2.5 text-sm last:border-b-0"
                  >
                    <span className={cn(duplicado && "text-muted-foreground")}>
                      {f.titulo} — {f.autor}
                    </span>
                    {duplicado && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        ya en tu biblioteca
                      </span>
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
