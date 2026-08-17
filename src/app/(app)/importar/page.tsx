"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!bibliotecaActual) return;
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const isbns = copias.map((c) => c.isbn);
  const globales = useLibrosGlobales(isbns);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filas = results.data.map(mapearFila).filter((f) => f.titulo);
        if (filas.length === 0) {
          toast.error("No encontramos filas con título en ese archivo.");
          return;
        }
        setPreview(filas);
      },
      error: () => toast.error("No pudimos leer ese archivo."),
    });
    e.target.value = "";
  }

  async function handleConfirmarImport() {
    if (!bibliotecaActual || !preview) return;
    setImportando(true);
    setProgreso(0);
    let ok = 0;
    for (const fila of preview) {
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
    toast.success(`Se agregaron ${ok} de ${preview.length} libro(s).`);
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
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
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
              {preview.slice(0, 30).map((f, i) => (
                <div key={i} className="border-b p-2.5 text-sm last:border-b-0">
                  {f.titulo} — {f.autor}
                </div>
              ))}
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
