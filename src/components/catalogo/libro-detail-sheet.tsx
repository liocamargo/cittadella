"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookMarked, Check, Star, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  actualizarPortada,
  devolverLibro,
  eliminarCopia,
  listenResenas,
  prestarLibro,
  publicarResena,
  toggleFavorito,
  toggleLeido,
} from "@/lib/firestore/libros";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import type { LibroEnBiblioteca, LibroGlobal, Resena } from "@/types";

interface LibroDetailSheetProps {
  copia: LibroEnBiblioteca | null;
  global?: LibroGlobal;
  onClose: () => void;
}

export function LibroDetailSheet({
  copia,
  global,
  onClose,
}: LibroDetailSheetProps) {
  const { user } = useAuth();
  const [prestando, setPrestando] = useState(false);
  const [loanName, setLoanName] = useState("");
  const [loanDate, setLoanDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);

  useEffect(() => {
    if (!copia) return;
    setPrestando(false);
    setReviewOpen(false);
    return listenResenas(copia.isbn, setResenas);
  }, [copia]);

  if (!copia) return null;

  async function handlePrestar() {
    if (!copia) return;
    if (!loanName.trim()) {
      toast.error("Ingresá a quién se lo prestás.");
      return;
    }
    try {
      await prestarLibro(copia.id, loanName.trim(), loanDate);
      setLoanName("");
      setPrestando(false);
    } catch (err) {
      console.error("Error registrando el préstamo:", err);
      toast.error("No pudimos registrar el préstamo.");
    }
  }

  async function handleDevolver() {
    if (!copia) return;
    try {
      await devolverLibro(copia.id);
    } catch (err) {
      console.error("Error registrando la devolución:", err);
      toast.error("No pudimos registrar la devolución.");
    }
  }

  async function handleEliminar() {
    if (!copia) return;
    if (!window.confirm(`¿Eliminar "${global?.titulo ?? "este libro"}" de tu biblioteca?`)) {
      return;
    }
    try {
      await eliminarCopia(copia.id);
      onClose();
    } catch (err) {
      console.error("Error eliminando el libro:", err);
      toast.error("No pudimos eliminar el libro.");
    }
  }

  async function handlePublicarResena() {
    if (!copia || !user) return;
    if (!comentario.trim()) {
      toast.error("Escribí un comentario.");
      return;
    }
    try {
      await publicarResena(
        copia.isbn,
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

  async function handleActualizarPortada(url: string) {
    if (!copia) return;
    try {
      await actualizarPortada(copia.isbn, url);
    } catch (err) {
      console.error("Error actualizando la portada:", err);
      toast.error("No pudimos actualizar la portada.");
    }
  }

  const inicial = (global?.titulo ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Sheet open={Boolean(copia)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-[420px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{global?.titulo}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-1">
          <div className="flex items-center gap-3">
            {global?.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={global.portadaUrl}
                alt={global?.titulo ?? ""}
                className="h-[170px] w-[120px] rounded-lg border object-cover"
              />
            ) : (
              <div className="flex h-[170px] w-[120px] items-center justify-center rounded-lg border bg-muted">
                <span className="text-3xl font-bold text-muted-foreground/60">
                  {inicial}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {global?.portadaUrl ? "Cambiar portada" : "Agregar portada"}
            </Button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{global?.titulo}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {global?.autor}
              </div>
            </div>
            <button
              onClick={() =>
                toggleFavorito(copia.id, !copia.favorito).catch((err) => {
                  console.error("Error actualizando favorito:", err);
                  toast.error("No pudimos actualizar el favorito.");
                })
              }
              className={cn(
                "flex size-8 items-center justify-center rounded-md border text-muted-foreground",
                copia.favorito && "text-amber-500"
              )}
            >
              <BookMarked
                className="size-4"
                fill={copia.favorito ? "currentColor" : "none"}
              />
            </button>
          </div>

          <Badge
            variant={copia.estado === "disponible" ? "secondary" : "outline"}
            className="w-fit"
          >
            {copia.estado === "disponible"
              ? "Disponible"
              : `Prestado a ${copia.prestadoA}`}
          </Badge>

          {global?.subtitulo && (
            <p className="text-sm italic text-muted-foreground">
              {global.subtitulo}
            </p>
          )}
          {global?.sinopsis && (
            <p className="text-sm leading-relaxed">{global.sinopsis}</p>
          )}

          <div className="flex gap-4 border-y py-3">
            <div>
              <div className="text-base font-bold">
                ★ {global?.ratingPromedio ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {global?.totalResenas ?? 0} reseña(s)
              </div>
            </div>
            <div>
              <div className="text-base font-bold">{global?.propietarios ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">propietario(s)</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Datos del libro
            </div>
            <div>
              <strong>ISBN:</strong> {copia.isbn || "—"}
            </div>
            <div>
              <strong>Editorial:</strong> {global?.editorial || "—"}
            </div>
            <div>
              <strong>Año:</strong> {global?.anio || "—"}
            </div>
            {global?.paginas && (
              <div>
                <strong>Páginas:</strong> {global.paginas}
              </div>
            )}
            <div>
              <strong>Idioma:</strong> {global?.idioma || "—"}
            </div>
            <div>
              <strong>Género:</strong> {global?.genero || "—"}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t pt-4 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Tu copia
            </div>
            <div>
              <strong>Estante:</strong> {copia.estante || "—"}
            </div>
            {copia.tipoTapa && (
              <div>
                <strong>Tapa:</strong> {copia.tipoTapa}
              </div>
            )}
            <div>
              <strong>Agregado:</strong> {copia.fechaAgregado?.slice(0, 10)}
            </div>
            {copia.notas && (
              <div>
                <strong>Notas privadas:</strong> {copia.notas}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-sm font-semibold">Reseñas de la comunidad</div>
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
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.comentario}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t">
          {prestando ? (
            <div className="flex flex-col gap-3">
              <Label>¿A quién se lo prestás?</Label>
              <Input
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="Nombre"
              />
              <Label>Fecha de salida</Label>
              <Input
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handlePrestar}>
                  Confirmar préstamo
                </Button>
                <Button variant="outline" onClick={() => setPrestando(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {copia.estado === "disponible" ? (
                <Button className="flex-1" onClick={() => setPrestando(true)}>
                  Prestar
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleDevolver}>
                  Devolver
                </Button>
              )}
              <Button
                variant="outline"
                className={cn(
                  copia.leido &&
                    "border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                )}
                onClick={() =>
                  toggleLeido(copia.id, !copia.leido).catch((err) => {
                    console.error("Error actualizando leído:", err);
                    toast.error("No pudimos actualizar el estado de leído.");
                  })
                }
              >
                {copia.leido && <Check className="size-4" />}
                {copia.leido ? "Leído" : "Marcar leído"}
              </Button>
              <Button variant="outline" size="icon" onClick={handleEliminar}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>

      <PortadaPicker
        open={portadaPickerOpen}
        onOpenChange={setPortadaPickerOpen}
        consultaInicial={global?.titulo ?? ""}
        isbn={copia.isbn}
        onSeleccionar={handleActualizarPortada}
      />
    </Sheet>
  );
}
