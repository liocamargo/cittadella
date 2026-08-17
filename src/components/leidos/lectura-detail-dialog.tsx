"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { listenResenas, publicarResena } from "@/lib/firestore/libros";
import { quitarLectura } from "@/lib/firestore/lecturas";
import type { LibroGlobal, Resena } from "@/types";

interface LecturaDetailDialogProps {
  isbn: string | null;
  global?: LibroGlobal;
  onClose: () => void;
}

export function LecturaDetailDialog({
  isbn,
  global,
  onClose,
}: LecturaDetailDialogProps) {
  const { user } = useAuth();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    if (!isbn) return;
    setReviewOpen(false);
    return listenResenas(isbn, setResenas);
  }, [isbn]);

  if (!isbn) return null;

  async function handlePublicarResena() {
    if (!isbn || !user) return;
    if (!comentario.trim()) {
      toast.error("Escribí un comentario.");
      return;
    }
    try {
      await publicarResena(
        isbn,
        user.uid,
        user.displayName ?? user.email ?? "Anónimo",
        estrellas,
        comentario.trim()
      );
      setComentario("");
      setReviewOpen(false);
    } catch (err) {
      console.error("Error publicando la reseña:", err);
      toast.error("No pudimos publicar la reseña.");
    }
  }

  async function handleQuitar() {
    if (!isbn || !user) return;
    if (!window.confirm(`¿Quitar "${global?.titulo ?? "este libro"}" de tus leídos?`)) {
      return;
    }
    try {
      await quitarLectura(user.uid, isbn);
      onClose();
    } catch (err) {
      console.error("Error quitando de leídos:", err);
      toast.error("No pudimos quitarlo de tus leídos.");
    }
  }

  const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Dialog open={Boolean(isbn)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{global?.titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center gap-3">
            {global?.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={global.portadaUrl}
                alt={global.titulo}
                className="h-[130px] w-[88px] rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted">
                <span className="text-2xl font-bold text-muted-foreground/60">
                  {inicial}
                </span>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">{global?.autor}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                ★ {global?.ratingPromedio ?? 0} ({global?.totalResenas ?? 0} reseña(s)) ·{" "}
                {global?.propietarios ?? 0} biblioteca(s) lo tienen
              </div>
            </div>
          </div>

          {global?.sinopsis && <p className="leading-relaxed">{global.sinopsis}</p>}

          <div className="border-t pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Reseñas de la comunidad</div>
              <button
                onClick={() => setReviewOpen((o) => !o)}
                className="text-xs font-semibold text-primary underline"
              >
                {reviewOpen ? "Cancelar" : "Escribir reseña"}
              </button>
            </div>

            {reviewOpen && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setEstrellas(n)}>
                      <Star
                        className={cn(
                          "size-4",
                          n <= estrellas
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Escribí tu reseña..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                />
                <Button size="sm" className="self-end" onClick={handlePublicarResena}>
                  Publicar reseña
                </Button>
              </div>
            )}

            {resenas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todavía no hay reseñas para este libro.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {resenas.map((r) => (
                <div key={r.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs font-semibold">
                    {r.usuarioNombre}{" "}
                    <span className="ml-1 font-normal text-amber-500">
                      {"★".repeat(r.estrellas)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.comentario}</div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" onClick={handleQuitar} className="text-destructive">
            <Trash2 className="size-4" />
            Quitar de leídos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
