"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logError } from "@/lib/log";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { eliminarDatosDeCuenta } from "@/lib/firestore/eliminar-cuenta";

const FRASE_CONFIRMACION = "ELIMINAR";

export function EliminarCuentaDialog() {
  const { user, deleteAccount, signOutUser } = useAuth();
  const { bibliotecas } = useBiblioteca();
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const confirmado = confirmacion.trim().toUpperCase() === FRASE_CONFIRMACION;

  function handleOpenChange(next: boolean) {
    if (eliminando) return;
    setOpen(next);
    if (!next) setConfirmacion("");
  }

  async function handleEliminar() {
    if (!user || !confirmado) return;
    setEliminando(true);
    try {
      await eliminarDatosDeCuenta(user.uid, bibliotecas);
      await deleteAccount();
      toast.success(t("eliminarCuenta.cuentaEliminada"));
      router.push("/");
    } catch (err) {
      if (err instanceof Error && err.message === "NEEDS_RELOGIN") {
        toast.error(t("eliminarCuenta.necesitaRelogin"));
        await signOutUser();
        router.push("/login");
        return;
      }
      logError("Error eliminando la cuenta:", err);
      toast.error(t("eliminarCuenta.errorEliminando"));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="mt-10 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm font-semibold text-destructive">{t("eliminarCuenta.zonaDePeligro")}</p>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          {t("eliminarCuenta.descripcionZonaDePeligro")}
        </p>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          {t("eliminarCuenta.eliminarMiCuenta")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("eliminarCuenta.tituloDialog")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {t("eliminarCuenta.confirmarPrefijo")}{" "}
              <strong>{FRASE_CONFIRMACION}</strong> {t("eliminarCuenta.confirmarSufijo")}
            </p>
            <div>
              <Label htmlFor="confirmar-eliminar" className="sr-only">
                {t("eliminarCuenta.escribirParaConfirmar", { frase: FRASE_CONFIRMACION })}
              </Label>
              <Input
                id="confirmar-eliminar"
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
              {eliminando ? t("eliminarCuenta.eliminando") : t("eliminarCuenta.eliminarMiCuenta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
