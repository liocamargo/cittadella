"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/log";
import { useLocale } from "@/hooks/use-locale";
import {
  buscarPorIsbn,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";
import { BuscarPorTitulo } from "@/components/catalogo/buscar-por-titulo";
import type { DatosComunidad } from "@/lib/firestore/libros";

interface BuscarMasInformacionProps {
  /** ISBN de la copia, si lo tiene (los ids "manual-..." no cuentan como ISBN real). */
  isbn?: string;
  idiomasLectura?: string[];
  onEncontrado: (datos: DatosComunidad) => void;
}

/**
 * Botón para completar los datos del libro buscando en Google Books (por
 * ISBN si lo tenemos, o por título como respaldo/alternativa). Se usa
 * dentro de los formularios de edición de la ficha de un libro.
 */
export function BuscarMasInformacion({
  isbn,
  idiomasLectura,
  onEncontrado,
}: BuscarMasInformacionProps) {
  const { t } = useLocale();
  const [buscando, setBuscando] = useState(false);
  const [porTitulo, setPorTitulo] = useState(false);
  const tieneIsbn = Boolean(isbn && !isbn.startsWith("manual-"));

  async function handleBuscarPorIsbn() {
    if (!isbn) return;
    setBuscando(true);
    try {
      const encontrado = await buscarPorIsbn(isbn, idiomasLectura);
      if (encontrado) {
        onEncontrado(encontrado);
        toast.success(t("buscarInformacion.completado"));
      } else {
        toast.error(t("buscarInformacion.errorSinIsbn"));
        setPorTitulo(true);
      }
    } catch (err) {
      logError("Error buscando más información:", err);
      toast.error(mensajeErrorBusqueda(err, t("buscarInformacion.errorBuscando")));
    } finally {
      setBuscando(false);
    }
  }

  function handleSeleccionarPorTitulo(resultado: ResultadoBusquedaTitulo) {
    onEncontrado(resultado);
    setPorTitulo(false);
    toast.success(t("buscarInformacion.completado"));
  }

  return (
    <div className="rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">{t("buscarInformacion.titulo")}</p>
          <p className="text-xs text-muted-foreground">
            {t("buscarInformacion.descripcion")}
          </p>
        </div>
        {tieneIsbn && !porTitulo && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleBuscarPorIsbn}
            disabled={buscando}
          >
            {buscando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {t("buscarInformacion.buscarPorIsbn")}
          </Button>
        )}
      </div>

      {tieneIsbn && !porTitulo && (
        <button
          type="button"
          onClick={() => setPorTitulo(true)}
          className="mt-2 text-xs text-muted-foreground underline"
        >
          {t("buscarInformacion.buscarPorTituloEnCambio")}
        </button>
      )}

      {(!tieneIsbn || porTitulo) && (
        <div className="mt-2">
          <BuscarPorTitulo idiomasLectura={idiomasLectura} onSeleccionar={handleSeleccionarPorTitulo} />
        </div>
      )}
    </div>
  );
}
