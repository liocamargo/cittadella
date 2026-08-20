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
import { useLocale } from "@/hooks/use-locale";
import { eliminarBibliotecaCompleta } from "@/lib/firestore/bibliotecas";
import { logError, logSuccess } from "@/lib/log";
import type { Biblioteca } from "@/types";

const FRASE_CONFIRMACION = "ELIMINAR";

export function EliminarBibliotecaDialog({ biblioteca }: { biblioteca: Biblioteca }) {
  const { bibliotecas } = useBiblioteca();
  const { t } = useLocale();
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
      toast.success(t("eliminarBiblioteca.exito"));
      router.push("/inicio");
    } catch (err) {
      logError("Error eliminando la biblioteca:", err);
      toast.error(t("eliminarBiblioteca.error"));
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="mt-10 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm font-semibold text-destructive">
          {t("eliminarBiblioteca.zonaPeligro")}
        </p>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          {esLaUnica ? (
            t("eliminarBiblioteca.unicaBiblioteca")
          ) : (
            <>
              {t("eliminarBiblioteca.descripcionBase")}
              {otrosMiembros > 0 &&
                t("eliminarBiblioteca.descripcionOtrosAcceso", {
                  personas:
                    otrosMiembros === 1
                      ? t("eliminarBiblioteca.otraPersona")
                      : t("eliminarBiblioteca.otrasPersonas", { cantidad: otrosMiembros }),
                })}{" "}
              {t("eliminarBiblioteca.descripcionFinal")}
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
          {t("eliminarBiblioteca.eliminarBoton")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("eliminarBiblioteca.confirmarTitulo", { nombre: biblioteca.nombre })}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {t("eliminarBiblioteca.confirmarInstruccionPre")}{" "}
              <strong>{FRASE_CONFIRMACION}</strong>{" "}
              {t("eliminarBiblioteca.confirmarInstruccionPost")}
            </p>
            <div>
              <Label htmlFor="confirmar-eliminar-biblioteca" className="sr-only">
                {t("eliminarBiblioteca.labelConfirmar", { frase: FRASE_CONFIRMACION })}
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
              {t("common.cancelar")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={!confirmado || eliminando}
            >
              {eliminando ? t("eliminarBiblioteca.eliminando") : t("eliminarBiblioteca.eliminarBoton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
