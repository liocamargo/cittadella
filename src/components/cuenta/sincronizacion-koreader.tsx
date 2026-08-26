"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { getSiteUrl } from "@/lib/site-url";
import { listenPerfil } from "@/lib/firestore/perfiles";
import { logError } from "@/lib/log";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClaveGenerada {
  usuario: string;
  clave: string;
}

function CampoCopiable({ label, valor }: { label: string; valor: string }) {
  const { t } = useLocale();
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1.5 text-xs">
          {valor}
        </code>
        <Button size="sm" variant="outline" onClick={handleCopiar}>
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? t("cuenta.sincronizacionCopiado") : t("cuenta.sincronizacionCopiar")}
        </Button>
      </div>
    </div>
  );
}

export function SincronizacionKoreader() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [generando, setGenerando] = useState(false);
  const [claveGenerada, setClaveGenerada] = useState<ClaveGenerada | null>(null);
  const [tieneClave, setTieneClave] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenPerfil(user.uid, (perfil) => {
      setTieneClave(Boolean(perfil?.claveSincronizacionHash));
    });
  }, [user]);

  async function handleGenerar() {
    if (!user) return;
    setGenerando(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/kosync/clave", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `status ${res.status}`);
      }
      const datos: ClaveGenerada = await res.json();
      setClaveGenerada(datos);
      setTieneClave(true);
    } catch (err) {
      logError("Error generando la clave de sincronización:", err);
      toast.error(t("cuenta.sincronizacionErrorGenerando"));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <Label className="mb-1.5 block text-sm font-semibold">
        {t("cuenta.sincronizacionTitulo")}
      </Label>
      <p className="mb-2 text-xs text-muted-foreground">{t("cuenta.sincronizacionDesc")}</p>
      <p className="mb-2 text-xs text-muted-foreground">
        {tieneClave
          ? t("cuenta.sincronizacionConfigurada")
          : t("cuenta.sincronizacionSinConfigurar")}
      </p>
      <Button variant="outline" size="sm" onClick={handleGenerar} disabled={generando}>
        {tieneClave
          ? t("cuenta.sincronizacionRegenerar")
          : t("cuenta.sincronizacionGenerar")}
      </Button>

      <Dialog
        open={Boolean(claveGenerada)}
        onOpenChange={(open) => !open && setClaveGenerada(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cuenta.sincronizacionDialogTitulo")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <p className="text-xs text-destructive">
              {t("cuenta.sincronizacionDialogAviso")}
            </p>
            <CampoCopiable label={t("cuenta.sincronizacionServidor")} valor={`${getSiteUrl()}/api/kosync`} />
            <CampoCopiable
              label={t("cuenta.sincronizacionUsuario")}
              valor={claveGenerada?.usuario ?? ""}
            />
            <CampoCopiable
              label={t("cuenta.sincronizacionContrasena")}
              valor={claveGenerada?.clave ?? ""}
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setClaveGenerada(null)}>
              {t("cuenta.sincronizacionEntendido")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
