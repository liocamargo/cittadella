"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  buscarPortadas,
  GoogleBooksError,
  type ResultadoPortada,
} from "@/services/google-books";
import { subirPortada } from "@/lib/firebase/portadas";

interface PortadaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultaInicial: string;
  isbn: string;
  onSeleccionar: (url: string) => void;
}

export function PortadaPicker({
  open,
  onOpenChange,
  consultaInicial,
  isbn,
  onSeleccionar,
}: PortadaPickerProps) {
  const [consulta, setConsulta] = useState(consultaInicial);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoPortada[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  async function handleBuscar() {
    if (!consulta.trim()) return;
    setBuscando(true);
    try {
      const r = await buscarPortadas(consulta.trim());
      setResultados(r);
      if (r.length === 0) {
        toast.error("No encontramos portadas para esa búsqueda.");
      }
    } catch (err) {
      console.error("Error buscando portadas:", err);
      if (err instanceof GoogleBooksError && err.esLimiteDeCuota) {
        toast.error("Google Books alcanzó su límite de consultas por ahora.");
      } else {
        toast.error("No pudimos buscar portadas.");
      }
    } finally {
      setBuscando(false);
    }
  }

  function handleSeleccionar(url: string) {
    onSeleccionar(url);
    onOpenChange(false);
  }

  async function procesarArchivo(file: File) {
    setSubiendo(true);
    try {
      const url = await subirPortada(isbn, file);
      handleSeleccionar(url);
      toast.success("Portada subida.");
    } catch (err) {
      console.error("Error subiendo portada:", err);
      const mensaje = err instanceof Error ? err.message : "No pudimos subir la foto.";
      toast.error(mensaje);
    } finally {
      setSubiendo(false);
    }
  }

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Portada del libro</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="buscar">
          <TabsList className="w-full">
            <TabsTrigger value="buscar" className="flex-1">
              Buscar en Google Books
            </TabsTrigger>
            <TabsTrigger value="subir" className="flex-1">
              Subir tu foto
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
              <Button onClick={handleBuscar} disabled={buscando}>
                <Search />
                Buscar
              </Button>
            </div>
            {resultados && (
              <div className="grid max-h-80 grid-cols-4 gap-3 overflow-y-auto">
                {resultados.map((r, i) => (
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
                    />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subir">
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
              {subiendo ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <UploadCloud className="size-5 text-muted-foreground" />
              )}
              <div className="text-sm text-muted-foreground">
                {subiendo
                  ? "Subiendo…"
                  : "Arrastrá una imagen, elegila o sacá una foto (máx. 5 MB)"}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleArchivo}
                disabled={subiendo}
                className="hidden"
              />
            </label>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
