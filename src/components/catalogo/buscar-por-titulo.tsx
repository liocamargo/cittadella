"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logError } from "@/lib/log";
import { useLocale } from "@/hooks/use-locale";
import {
  buscarPorTitulo,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";

interface BuscarPorTituloProps {
  idiomasLectura?: string[];
  onSeleccionar: (resultado: ResultadoBusquedaTitulo) => void;
}

export function BuscarPorTitulo({ idiomasLectura, onSeleccionar }: BuscarPorTituloProps) {
  const { t } = useLocale();
  const [consulta, setConsulta] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusquedaTitulo[] | null>(null);

  async function handleBuscar() {
    const texto = consulta.trim();
    if (!texto) return;
    setBuscando(true);
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
      setBuscando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder={t("buscarPorTitulo.placeholderConsulta")}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
        />
        <Button variant="outline" onClick={handleBuscar} disabled={buscando}>
          {buscando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
        </Button>
      </div>

      {resultados && resultados.length > 0 && (
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border p-1.5">
          {resultados.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeleccionar(r)}
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
    </div>
  );
}
