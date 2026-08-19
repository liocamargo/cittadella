"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { logError } from "@/lib/log";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/hooks/use-locale";
import {
  buscarPortadas,
  mensajeErrorBusqueda,
  type ResultadoPortada,
} from "@/services/google-books";

interface PortadaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultaInicial: string;
  onSeleccionar: (url: string) => void;
}

export function PortadaPicker({
  open,
  onOpenChange,
  consultaInicial,
  onSeleccionar,
}: PortadaPickerProps) {
  const [consulta, setConsulta] = useState(consultaInicial);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoPortada[] | null>(null);
  const [rotas, setRotas] = useState<Set<number>>(new Set());
  const [linkExterno, setLinkExterno] = useState("");
  const { localeLectura } = useLocale();

  // Al abrir, busca sola con lo que ya sabemos del libro (título/autor) para
  // no obligar a tipear y apretar "Buscar" de entrada.
  useEffect(() => {
    if (!open) {
      setResultados(null);
      setLinkExterno("");
      return;
    }
    setConsulta(consultaInicial);
    if (consultaInicial.trim()) {
      handleBuscar(consultaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleBuscar(consultaAUsar?: string) {
    const texto = (consultaAUsar ?? consulta).trim();
    if (!texto) return;
    setBuscando(true);
    try {
      const r = await buscarPortadas(texto, localeLectura);
      setResultados(r);
      setRotas(new Set());
      if (r.length === 0) {
        toast.error("No encontramos portadas para esa búsqueda.");
      }
    } catch (err) {
      logError("Error buscando portadas:", err);
      toast.error(mensajeErrorBusqueda(err, "No pudimos buscar portadas."));
    } finally {
      setBuscando(false);
    }
  }

  function handleSeleccionar(url: string) {
    onSeleccionar(url);
    onOpenChange(false);
  }

  function handleUsarLink() {
    const url = linkExterno.trim();
    if (!url || !/^https?:\/\//.test(url)) {
      toast.error("Pegá un link válido (que empiece con http:// o https://).");
      return;
    }
    handleSeleccionar(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Portada del libro</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="buscar">
          <TabsList className="w-full">
            <TabsTrigger value="buscar" className="flex-1">
              Buscar portada
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              Link externo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buscar" className="flex flex-col gap-3">
            <div className="flex gap-2">
              <SearchInput
                value={consulta}
                onValueChange={setConsulta}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                placeholder="Título o autor"
                className="flex-1"
              />
              <Button onClick={() => handleBuscar()} disabled={buscando}>
                {buscando ? <Loader2 className="animate-spin" /> : <Search />}
                Buscar
              </Button>
            </div>
            {buscando && !resultados && (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4.2] animate-pulse rounded-md border bg-muted" />
                ))}
              </div>
            )}
            {resultados && resultados.length > 0 && (
              <div className="grid max-h-80 grid-cols-4 gap-3 overflow-y-auto">
                {resultados.map((r, i) =>
                  rotas.has(i) ? null : (
                    <button
                      key={i}
                      onClick={() => handleSeleccionar(r.portadaUrl)}
                      className="flex flex-col gap-1 text-left"
                      title={`${r.titulo} — ${r.autor}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.portadaUrl}
                        alt={r.titulo}
                        className="aspect-[3/4.2] w-full rounded-md border object-cover transition-opacity hover:opacity-75"
                        onError={() => setRotas((prev) => new Set(prev).add(i))}
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="link" className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Pegá la URL de una imagen (termina en .jpg, .png, etc.).
            </p>
            <div className="flex gap-2">
              <Input
                value={linkExterno}
                onChange={(e) => setLinkExterno(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUsarLink()}
                placeholder="https://..."
                className="flex-1"
              />
              <Button onClick={handleUsarLink}>
                <Link2 />
                Usar
              </Button>
            </div>
            {linkExterno.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linkExterno.trim()}
                alt="Vista previa"
                className="h-[130px] w-[88px] rounded-md border object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
