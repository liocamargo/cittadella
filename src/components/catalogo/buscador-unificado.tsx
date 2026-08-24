"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logError } from "@/lib/log";
import { useLocale } from "@/hooks/use-locale";
import { BarcodeScanner } from "@/components/catalogo/barcode-scanner";
import {
  buscarPorTitulo,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";

/** ISBN-10 (9 dígitos + dígito verificador, puede ser X) o ISBN-13, sin espacios/guiones. */
function comoIsbn(texto: string): string | null {
  const limpio = texto.replace(/[\s-]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(limpio) ? limpio : null;
}

interface BuscadorUnificadoProps {
  idiomasLectura?: string[];
  /** Búsqueda por ISBN en curso, controlada por el padre (chequeo de copias + Google Books/local). */
  buscandoIsbn: boolean;
  /** Se abre la cámara sola apenas monta, sin esperar a que el usuario la pida. */
  forzarCamaraAlMontar?: boolean;
  onIsbnDetectado: (isbn: string) => void;
  onSeleccionarResultado: (resultado: ResultadoBusquedaTitulo) => void;
  onCargarManualmente: () => void;
}

/**
 * Un solo campo para las tres formas de encontrar un libro: escanear,
 * tipear el ISBN o buscar por título/autor. Detecta solo si lo que se
 * tipeó es un ISBN (busca ese libro puntual) o texto libre (busca por
 * título y muestra resultados para elegir). "Cargar a mano" queda como
 * un link discreto, no como un cuarto camino compitiendo visualmente.
 */
export function BuscadorUnificado({
  idiomasLectura,
  buscandoIsbn,
  forzarCamaraAlMontar,
  onIsbnDetectado,
  onSeleccionarResultado,
  onCargarManualmente,
}: BuscadorUnificadoProps) {
  const { t } = useLocale();
  const [consulta, setConsulta] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [buscandoTitulo, setBuscandoTitulo] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusquedaTitulo[] | null>(null);
  const largoAnteriorRef = useRef(0);

  // En mobile (o al reiniciar tras "cargar varios seguidos") la cámara se
  // abre sola: es el caso de uso más común, escanear el lomo en mano.
  useEffect(() => {
    if (forzarCamaraAlMontar || window.matchMedia("(max-width: 767px)").matches) {
      setEscaneando(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscarPorTexto(texto: string) {
    setBuscandoTitulo(true);
    setResultados(null);
    try {
      const encontrados = await buscarPorTitulo(texto, idiomasLectura);
      if (encontrados.length === 0) {
        toast.error(t("buscarPorTitulo.errorSinResultados"));
      }
      setResultados(encontrados);
    } catch (err) {
      logError("Error buscando por título:", err);
      toast.error(mensajeErrorBusqueda(err, t("buscarPorTitulo.errorBuscando")));
    } finally {
      setBuscandoTitulo(false);
    }
  }

  function handleBuscar() {
    const texto = consulta.trim();
    if (!texto) return;
    const isbn = comoIsbn(texto);
    if (isbn) {
      onIsbnDetectado(isbn);
    } else {
      buscarPorTexto(texto);
    }
  }

  // Auto-búsqueda: apenas lo tipeado forma un ISBN válido, buscamos solo,
  // sin esperar que aprieten el botón (igual que antes).
  useEffect(() => {
    const isbn = comoIsbn(consulta);
    const largo = consulta.replace(/[\s-]/g, "").length;
    if (isbn && !buscandoIsbn && largo !== largoAnteriorRef.current) {
      onIsbnDetectado(isbn);
    }
    largoAnteriorRef.current = largo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta]);

  function handleDetected(codigoCrudo: string) {
    const isbn = comoIsbn(codigoCrudo) ?? codigoCrudo.replace(/[^0-9Xx]/g, "").slice(0, 13);
    setEscaneando(false);
    setConsulta(isbn);
    onIsbnDetectado(isbn);
  }

  const buscando = buscandoIsbn || buscandoTitulo;

  return (
    <div className="flex flex-col gap-3">
      {escaneando ? (
        <>
          <BarcodeScanner onDetected={handleDetected} />
          <Button variant="ghost" size="sm" onClick={() => setEscaneando(false)}>
            {t("catalogoAgregar.cancelarEscaneo")}
          </Button>
        </>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setEscaneando(true)}
            aria-label={t("catalogoAgregar.escanearCamara")}
          >
            <Camera className="size-4" />
          </Button>
          <Input
            placeholder={t("catalogoAgregar.buscarUnificadoPlaceholder")}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
          <Button onClick={handleBuscar} disabled={buscando}>
            {buscando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>
      )}

      {buscandoTitulo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t("catalogoAgregar.buscandoLibro")}
        </div>
      )}

      {resultados && resultados.length > 0 && (
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border p-1.5">
          {resultados.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeleccionarResultado(r)}
              className="flex items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-muted"
            >
              {r.portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.portadaUrl}
                  alt=""
                  className="h-12 w-8 shrink-0 rounded-sm border object-cover"
                />
              ) : (
                <div className="h-12 w-8 shrink-0 rounded-sm border bg-muted" />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.autor || t("buscarPorTitulo.autorDesconocido")}
                  {r.anio ? ` · ${r.anio}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onCargarManualmente}
        className="self-start text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {t("catalogoAgregar.cargarManualmente")}
      </button>
    </div>
  );
}
