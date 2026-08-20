"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { useLocale } from "@/hooks/use-locale";
import { logError } from "@/lib/log";
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
  const { t } = useLocale();
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
      toast.error(t("importar.errorNoCsv"));
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columnas = results.meta.fields ?? [];
        const reconoce = columnas.some((c) => COLUMNAS_RECONOCIDAS.includes(c.trim()));
        if (!reconoce) {
          toast.error(t("importar.errorColumnasNoReconocidas"));
          return;
        }
        const conTitulo = results.data.map(mapearFila).filter((f) => f.titulo);
        if (conTitulo.length === 0) {
          toast.error(t("importar.errorSinTitulo"));
          return;
        }
        const filas = conTitulo.filter((f) => f.isbn);
        const sinIsbn = conTitulo.length - filas.length;
        if (filas.length === 0) {
          toast.error(t("importar.errorSinIsbn"));
          return;
        }
        if (sinIsbn > 0) {
          toast.warning(t("importar.avisoFilasSinIsbn", { cantidad: sinIsbn }));
        }
        setPreview(filas);
        setDatosComunidad({});
        cargarDatosComunidad(filas);
      },
      error: (err) => {
        logError("Error leyendo el CSV:", err);
        toast.error(t("importar.errorLeyendoArchivo"));
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
        logError(`Error importando "${fila.titulo}" (ISBN ${fila.isbn}):`, err);
        fallidos += 1;
      }
      setProgreso((p) => p + 1);
    }
    setImportando(false);
    setPreview(null);
    const detalles = [
      omitidos > 0 && t("importar.detalleOmitidos", { cantidad: omitidos }),
      fallidos > 0 && t("importar.detalleFallidos", { cantidad: fallidos }),
    ].filter(Boolean);
    const detalle = detalles.length > 0 ? ` (${detalles.join(", ")})` : "";
    toast.success(t("importar.resultadoImportacion", { ok, total: preview.length, detalle }));
  }

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-2xl font-bold">{t("importar.titulo")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("importar.subtitulo")}
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">{t("importar.exportarTitulo")}</div>
        <p className="mb-3 text-sm text-muted-foreground">
          {t("importar.exportarDescripcion", { cantidad: copias.length })}
        </p>
        <Button variant="outline" onClick={handleExportar}>
          {t("importar.descargarCsv")}
        </Button>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">{t("importar.importarTitulo")}</div>
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
            {t("importar.arrastrarArchivo")}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground/70">
            {t("importar.soportaFormatos")}
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
          {t("importar.descargarPlantilla")}
        </Button>

        {preview && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-muted-foreground">
              {t("importar.filasDetectadas", { cantidad: preview.length })}
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
                        {t("importar.yaEnBiblioteca")}
                      </span>
                    ) : (
                      enComunidad && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {t("importar.yaEnComunidad")}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
              {preview.length > 30 && (
                <div className="p-2.5 text-xs text-muted-foreground">
                  {t("importar.yMasFilas", { cantidad: preview.length - 30 })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleConfirmarImport} disabled={importando}>
                {importando
                  ? t("importar.importando", { progreso, total: preview.length })
                  : t("importar.agregarCatalogo")}
              </Button>
              <Button
                variant="ghost"
                disabled={importando}
                onClick={() => setPreview(null)}
              >
                {t("common.cancelar")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
