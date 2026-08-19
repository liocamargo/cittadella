"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { logError } from "@/lib/log";
import {
  actualizarWhatsappMiembro,
  cancelarInvitacion,
  invitarMiembro,
  quitarMiembro,
  renombrarBiblioteca,
  renombrarMiembro,
  setModoSocios,
} from "@/lib/firestore/bibliotecas";
import { EliminarBibliotecaDialog } from "@/components/espacio/eliminar-biblioteca-dialog";

export default function EspacioPage() {
  const { user } = useAuth();
  const { bibliotecaActual } = useBiblioteca();
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreEspacio, setNombreEspacio] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  if (!bibliotecaActual) {
    return (
      <div className="text-sm text-muted-foreground">Cargando tu biblioteca…</div>
    );
  }

  const miembros = bibliotecaActual.miembrosUids.map((uid) => ({
    uid,
    nombre:
      bibliotecaActual.nombresMiembros[uid] ??
      bibliotecaActual.emailsMiembros[uid] ??
      uid,
    email: bibliotecaActual.emailsMiembros[uid] ?? "",
    whatsapp: bibliotecaActual.whatsappMiembros[uid] ?? "",
    esOwner: uid === bibliotecaActual.creadaPor,
  }));

  async function handleGuardarNombreEspacio() {
    if (!bibliotecaActual) return;
    if (!nombreEspacio.trim()) return;
    setGuardandoNombre(true);
    try {
      await renombrarBiblioteca(bibliotecaActual.id, nombreEspacio.trim());
      setEditingNombre(false);
    } catch (err) {
      logError("Error renombrando el espacio:", err);
      toast.error("No pudimos renombrar el espacio.");
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function handleGuardarNombre(uid: string) {
    if (!bibliotecaActual) return;
    if (!editName.trim()) return;
    await renombrarMiembro(bibliotecaActual.id, uid, editName.trim());
    await actualizarWhatsappMiembro(bibliotecaActual.id, uid, editWhatsapp);
    setEditingUid(null);
  }

  async function handleQuitar(uid: string) {
    if (!bibliotecaActual) return;
    if (!window.confirm("¿Quitarle el acceso a esta persona?")) return;
    await quitarMiembro(bibliotecaActual.id, uid);
  }

  async function handleInvitar() {
    if (!bibliotecaActual) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Ingresá un correo válido.");
      return;
    }
    setInviting(true);
    try {
      await invitarMiembro(bibliotecaActual.id, email);
      setInviteEmail("");

      try {
        const idToken = await user?.getIdToken();
        const res = await fetch("/api/invitar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email,
            bibliotecaId: bibliotecaActual.id,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        toast.success(`Le mandamos un mail a ${email} para que se una.`);
      } catch (err) {
        logError("Error mandando el email de invitación:", err);
        toast.warning(
          "Guardamos la invitación, pero no pudimos mandar el email. Se une igual cuando esa persona se loguee con ese correo."
        );
      }
    } catch (err) {
      logError("Error guardando la invitación:", err);
      toast.error("No pudimos invitar a esa persona.");
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelarInvitacion(email: string) {
    if (!bibliotecaActual) return;
    await cancelarInvitacion(bibliotecaActual.id, email);
  }

  async function handleToggleModoSocios(activo: boolean) {
    if (!bibliotecaActual) return;
    if (
      activo &&
      !window.confirm(
        "Al activar el modo socios, los préstamos nuevos se van a asignar a socios registrados en vez de anotar un nombre libre. ¿Continuar?"
      )
    ) {
      return;
    }
    try {
      await setModoSocios(bibliotecaActual.id, activo);
    } catch (err) {
      logError("Error actualizando el modo socios:", err);
      toast.error("No pudimos actualizar el modo de préstamos.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Espacio compartido</h1>

      {editingNombre ? (
        <div className="mb-1 mt-2 flex items-center gap-1.5">
          <Input
            autoFocus
            value={nombreEspacio}
            onChange={(e) => setNombreEspacio(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGuardarNombreEspacio()}
            className="h-8 max-w-xs text-sm font-semibold"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleGuardarNombreEspacio}
            disabled={guardandoNombre}
          >
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setEditingNombre(false)}
            disabled={guardandoNombre}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="mb-1 mt-2 flex items-center gap-1.5">
          <p className="text-sm text-muted-foreground">
            Nombre del espacio: <strong>{bibliotecaActual.nombre}</strong>
          </p>
          <button
            onClick={() => {
              setNombreEspacio(bibliotecaActual.nombre);
              setEditingNombre(true);
            }}
            className="text-muted-foreground"
            aria-label="Editar nombre del espacio"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      )}

      <p className="mb-1 mt-1 text-sm text-muted-foreground">
        Todos los miembros pueden agregar, editar y prestar libros de esta
        biblioteca.
      </p>
      <p className="mb-7 text-xs text-muted-foreground">
        Si cargás tu WhatsApp, quien vea el catálogo público va a poder
        pedirte libros directo desde ahí.
      </p>

      <div className="mb-7 flex items-center justify-between gap-4 rounded-lg border p-3.5">
        <div>
          <Label className="text-sm font-semibold">Modo socios</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Los préstamos se asignan a socios registrados (con historial) en
            vez de anotar un nombre libre. Los dos modos no conviven.
          </p>
        </div>
        <Switch
          checked={bibliotecaActual.modoSocios}
          onCheckedChange={handleToggleModoSocios}
        />
      </div>

      <div className="mb-6 flex flex-col divide-y overflow-hidden rounded-lg border">
        {miembros.map((m) => (
          <div
            key={m.uid}
            className="flex items-center justify-between gap-2.5 bg-card p-3.5"
          >
            {editingUid === m.uid ? (
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Input
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="WhatsApp (con código de país, ej: 5491122334455)"
                  inputMode="numeric"
                  className="h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-8" onClick={() => handleGuardarNombre(m.uid)}>
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setEditingUid(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold">{m.nombre}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
                {m.whatsapp && (
                  <div className="text-xs text-muted-foreground">WhatsApp: {m.whatsapp}</div>
                )}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2.5">
              <Badge variant={m.esOwner ? "default" : "secondary"}>
                {m.esOwner ? "Dueño" : "Miembro"}
              </Badge>
              {editingUid !== m.uid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setEditingUid(m.uid);
                    setEditName(m.nombre);
                    setEditWhatsapp(m.whatsapp);
                  }}
                >
                  Editar
                </Button>
              )}
              {!m.esOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive"
                  onClick={() => handleQuitar(m.uid)}
                >
                  Quitar acceso
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {bibliotecaActual.invitacionesPendientes.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">
            Invitaciones pendientes
          </div>
          <div className="flex flex-col gap-1.5">
            {bibliotecaActual.invitacionesPendientes.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg border border-dashed p-2.5 text-sm"
              >
                <span className="text-muted-foreground">{email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => handleCancelarInvitacion(email)}
                >
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm font-semibold">Invitar a un nuevo miembro</div>
      <p className="mb-2 mt-1 text-xs text-muted-foreground">
        Le mandamos un mail con un link para entrar. Se une automáticamente
        cuando inicie sesión con ese correo (Google o link de acceso).
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvitar()}
        />
        <Button onClick={handleInvitar} disabled={inviting}>
          Invitar
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Conectado como <strong>{user?.email}</strong>
      </p>

      <EliminarBibliotecaDialog biblioteca={bibliotecaActual} />
    </div>
  );
}
