"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { eliminarBibliotecaCompleta } from "@/lib/firestore/bibliotecas";
import { logError, logSuccess } from "@/lib/log";
import type { Biblioteca } from "@/types";

const FRASE_CONFIRMACION = "ELIMINAR";

export function EliminarBibliotecaDialog({ biblioteca }: { biblioteca: Biblioteca }) {
  const { bibliotecas } = useBiblioteca();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const esLaUnica = bibliotecas.length <= 1;
  const otrosMiembros = biblioteca.miembrosUids.length - 1;
  const confirmado = confirmacion.trim().toUpperCase() === FRASE_CONFIRMACION;

  function handleOpenChange(next: boolean) {
    if (eliminando) return;
    setOpen(next);
    if (!next) setConfirmacion("");
  }

  async function handleEliminar() {
    if (!confirmado) return;
    setEliminando(true);
    try {
      await eliminarBibliotecaCompleta(biblioteca.id);
      logSuccess("Biblioteca eliminada.", { id: biblioteca.id, nombre: biblioteca.nombre });
      toast.success("Biblioteca eliminada.");
      router.push("/inicio");
    } catch (err) {
      logError("Error eliminando la biblioteca:", err);
      toast.error("No pudimos eliminar la biblioteca.");
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="mt-10 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm font-semibold text-destructive">Zona de peligro</p>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          {esLaUnica ? (
            <>
              Esta es tu única biblioteca, así que no se puede eliminar.
              Creá otra desde el menú de cuenta si querés borrar esta.
            </>
          ) : (
            <>
              Elimina esta biblioteca para siempre: todos sus libros, socios
              e historial de préstamos.
              {otrosMiembros > 0 &&
                ` También le va a sacar el acceso a ${otrosMiembros === 1 ? "la otra persona" : `las otras ${otrosMiembros} personas`} que la comparten con vos.`}{" "}
              Esta acción no se puede deshacer.
            </>
          )}
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={esLaUnica}
        >
          <Trash2 className="size-4" />
          Eliminar esta biblioteca
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar &quot;{biblioteca.nombre}&quot; para siempre?</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Esto es permanente. Para confirmar, escribí{" "}
              <strong>{FRASE_CONFIRMACION}</strong> abajo.
            </p>
            <div>
              <Label htmlFor="confirmar-eliminar-biblioteca" className="sr-only">
                Escribí {FRASE_CONFIRMACION} para confirmar
              </Label>
              <Input
                id="confirmar-eliminar-biblioteca"
                autoFocus
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={FRASE_CONFIRMACION}
                disabled={eliminando}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={!confirmado || eliminando}
            >
              {eliminando ? "Eliminando…" : "Eliminar esta biblioteca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
