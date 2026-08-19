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
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { eliminarDatosDeCuenta } from "@/lib/firestore/eliminar-cuenta";

const FRASE_CONFIRMACION = "ELIMINAR";

export function EliminarCuentaDialog() {
  const { user, deleteAccount, signOutUser } = useAuth();
  const { bibliotecas } = useBiblioteca();
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
      toast.success("Tu cuenta fue eliminada.");
      router.push("/");
    } catch (err) {
      if (err instanceof Error && err.message === "NEEDS_RELOGIN") {
        toast.error(
          "Por seguridad, necesitamos que vuelvas a iniciar sesión antes de eliminar tu cuenta. Ya borramos el resto de tus datos: iniciá sesión de nuevo y volvé a intentarlo para terminar."
        );
        await signOutUser();
        router.push("/login");
        return;
      }
      console.error("Error eliminando la cuenta:", err);
      toast.error("No pudimos eliminar tu cuenta. Probá de nuevo.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="mt-10 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm font-semibold text-destructive">Zona de peligro</p>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Eliminar tu cuenta borra tu perfil, tus lecturas, y cualquier
          biblioteca de la que seas la única persona miembro (con todos sus
          libros). Si compartís una biblioteca con alguien más, solo vas a
          dejar de tener acceso a ella. Esta acción no se puede deshacer.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          Eliminar mi cuenta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta para siempre?</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Esto es permanente. Para confirmar, escribí{" "}
              <strong>{FRASE_CONFIRMACION}</strong> abajo.
            </p>
            <div>
              <Label htmlFor="confirmar-eliminar" className="sr-only">
                Escribí {FRASE_CONFIRMACION} para confirmar
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
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleEliminar}
              disabled={!confirmado || eliminando}
            >
              {eliminando ? "Eliminando…" : "Eliminar mi cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
