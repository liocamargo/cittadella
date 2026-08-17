"use client";

import { useEffect, useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { devolverLibro, listenInventario, prestarLibro } from "@/lib/firestore/libros";
import type { LibroEnBiblioteca } from "@/types";

export default function PrestamosPage() {
  const { bibliotecaActual } = useBiblioteca();
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [prestarOpen, setPrestarOpen] = useState(false);
  const [copiaAPrestar, setCopiaAPrestar] = useState("");
  const [nombrePrestamo, setNombrePrestamo] = useState("");
  const [fechaPrestamo, setFechaPrestamo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [guardandoPrestamo, setGuardandoPrestamo] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  const prestados = useMemo(
    () => copias.filter((c) => c.estado === "prestado"),
    [copias]
  );
  const disponibles = useMemo(
    () => copias.filter((c) => c.estado === "disponible"),
    [copias]
  );
  const isbns = useMemo(() => copias.map((c) => c.isbn), [copias]);
  const globales = useLibrosGlobales(isbns);

  async function handleDevolver(id: string) {
    try {
      await devolverLibro(id);
      toast.success("Marcado como devuelto.");
    } catch (err) {
      console.error("Error marcando devolución:", err);
      toast.error("No pudimos actualizar el préstamo.");
    }
  }

  function abrirPrestar() {
    setCopiaAPrestar("");
    setNombrePrestamo("");
    setFechaPrestamo(new Date().toISOString().slice(0, 10));
    setPrestarOpen(true);
  }

  async function handlePrestar() {
    if (!copiaAPrestar) {
      toast.error("Elegí qué libro prestás.");
      return;
    }
    if (!nombrePrestamo.trim()) {
      toast.error("Ingresá a quién se lo prestás.");
      return;
    }
    setGuardandoPrestamo(true);
    try {
      await prestarLibro(copiaAPrestar, nombrePrestamo.trim(), fechaPrestamo);
      toast.success("Préstamo registrado.");
      setPrestarOpen(false);
    } catch (err) {
      console.error("Error registrando el préstamo:", err);
      toast.error("No pudimos registrar el préstamo.");
    } finally {
      setGuardandoPrestamo(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Préstamos</h1>
        <Button
          className="hidden md:inline-flex"
          onClick={abrirPrestar}
          disabled={disponibles.length === 0}
        >
          <Handshake />
          Prestar libro
        </Button>
      </div>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {prestados.length} libro(s) actualmente prestado(s)
      </p>

      {/* Mobile: FAB flotante para prestar, igual que en Catálogo */}
      <button
        onClick={abrirPrestar}
        disabled={disponibles.length === 0}
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-40 md:hidden"
        aria-label="Prestar libro"
      >
        <Handshake className="size-6" />
      </button>

      {prestados.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No hay libros prestados ahora mismo.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
        {prestados.map((copia) => {
          const global = globales[copia.isbn];
          const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();
          return (
            <div key={copia.id} className="flex flex-col gap-2">
              <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                <span className="text-[26px] font-bold text-muted-foreground/60">
                  {inicial}
                </span>
              </div>
              <div className="text-[13px] font-semibold leading-tight">
                {global?.titulo}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground" title={global?.autor}>
                {global?.autor}
              </div>
              <Badge variant="outline" className="w-fit text-[11px]">
                Prestado a {copia.prestadoA}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDevolver(copia.id)}
              >
                Marcar como devuelto
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={prestarOpen} onOpenChange={setPrestarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prestar libro</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Libro
              </Label>
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tenés libros disponibles para prestar.
                </p>
              ) : (
                <Select value={copiaAPrestar} onValueChange={setCopiaAPrestar}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un libro" />
                  </SelectTrigger>
                  <SelectContent>
                    {disponibles.map((c) => {
                      const g = globales[c.isbn];
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {g?.titulo ?? "Sin título"}
                          {g?.autor ? ` — ${g.autor}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                ¿A quién se lo prestás?
              </Label>
              <Input
                value={nombrePrestamo}
                onChange={(e) => setNombrePrestamo(e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha de salida
              </Label>
              <Input
                type="date"
                value={fechaPrestamo}
                onChange={(e) => setFechaPrestamo(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPrestarOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handlePrestar}
                disabled={guardandoPrestamo || disponibles.length === 0}
              >
                Confirmar préstamo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
