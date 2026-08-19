"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Star, Trash2 } from "lucide-react";
import { logError } from "@/lib/log";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import {
  actualizarCopia,
  actualizarLibroGlobal,
  actualizarPortada,
  devolverLibro,
  eliminarCopia,
  listenResenas,
  prestarLibro,
  publicarResena,
  toggleFavorito,
  toggleLeido,
  type DatosComunidad,
} from "@/lib/firestore/libros";
import { listenSocios } from "@/lib/firestore/socios";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import { RatingCara, RatingCaraPicker } from "@/components/catalogo/rating-cara";
import { IdiomaSelect } from "@/components/catalogo/idioma-select";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarMasInformacion } from "@/components/catalogo/buscar-mas-informacion";
import type { LibroEnBiblioteca, LibroGlobal, Resena, Socio } from "@/types";

const CAMPOS_EDITABLES = {
  titulo: "",
  subtitulo: "",
  autor: "",
  editorial: "",
  anio: "",
  paginas: "",
  volumen: "",
  idioma: "",
  genero: "",
  sinopsis: "",
  estante: "",
  tipoTapa: "",
  notas: "",
};

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
  const { bibliotecaActual } = useBiblioteca();
  const { localeLectura } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();
  const [prestando, setPrestando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formEdit, setFormEdit] = useState(CAMPOS_EDITABLES);
  const [loanName, setLoanName] = useState("");
  const [loanSocioId, setLoanSocioId] = useState("");
  const [loanDate, setLoanDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [socios, setSocios] = useState<Socio[]>([]);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState("");
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);

  useEffect(() => {
    if (!copia) return;
    setPrestando(false);
    setReviewOpen(false);
    setEditando(false);
    return listenResenas(copia.isbn, setResenas);
  }, [copia]);

  useEffect(() => {
    if (!bibliotecaActual?.modoSocios) {
      setSocios([]);
      return;
    }
    return listenSocios(bibliotecaActual.id, setSocios);
  }, [bibliotecaActual]);

  if (!copia) return null;

  function setCampoEdit<K extends keyof typeof CAMPOS_EDITABLES>(
    campo: K,
    valor: string
  ) {
    setFormEdit((f) => ({ ...f, [campo]: valor }));
  }

  function handleEmpezarEdicion() {
    if (!copia) return;
    setFormEdit({
      titulo: global?.titulo ?? "",
      subtitulo: global?.subtitulo ?? "",
      autor: global?.autor ?? "",
      editorial: global?.editorial ?? "",
      anio: global?.anio ?? "",
      paginas: global?.paginas ?? "",
      volumen: global?.volumen ?? "",
      idioma: global?.idioma ?? "",
      genero: global?.genero ?? "",
      sinopsis: global?.sinopsis ?? "",
      estante: copia.estante ?? "",
      tipoTapa: copia.tipoTapa ?? "",
      notas: copia.notas ?? "",
    });
    setEditando(true);
  }

  async function handleGuardarEdicion() {
    if (!copia) return;
    if (!formEdit.titulo.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setGuardandoEdicion(true);
    try {
      await actualizarLibroGlobal(copia.isbn, {
        titulo: formEdit.titulo.trim(),
        subtitulo: formEdit.subtitulo.trim() || undefined,
        autor: formEdit.autor.trim(),
        editorial: formEdit.editorial.trim() || undefined,
        anio: formEdit.anio.trim() || undefined,
        paginas: formEdit.paginas.trim() || undefined,
        volumen: formEdit.volumen.trim() || undefined,
        idioma: formEdit.idioma.trim() || undefined,
        genero: formEdit.genero.trim() || undefined,
        sinopsis: formEdit.sinopsis.trim() || undefined,
      });
      await actualizarCopia(copia.id, {
        estante: formEdit.estante.trim(),
        tipoTapa: formEdit.tipoTapa.trim() || undefined,
        notas: formEdit.notas.trim() || undefined,
      });
      toast.success("Datos actualizados.");
      setEditando(false);
    } catch (err) {
      logError("Error editando el libro:", err);
      toast.error("No pudimos guardar los cambios.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handlePrestar() {
    if (!copia) return;
    const modoSocios = Boolean(bibliotecaActual?.modoSocios);
    const nombreDestino = modoSocios
      ? socios.find((s) => s.id === loanSocioId)?.nombre ?? ""
      : loanName.trim();
    if (modoSocios && !loanSocioId) {
      toast.error("Elegí a qué socio se lo prestás.");
      return;
    }
    if (!modoSocios && !nombreDestino) {
      toast.error("Ingresá a quién se lo prestás.");
      return;
    }
    try {
      await prestarLibro(
        copia,
        nombreDestino,
        loanDate,
        modoSocios ? loanSocioId : undefined
      );
      setLoanName("");
      setLoanSocioId("");
      setPrestando(false);
    } catch (err) {
      logError("Error registrando el préstamo:", err);
      toast.error("No pudimos registrar el préstamo.");
    }
  }

  async function handleDevolver() {
    if (!copia) return;
    try {
      await devolverLibro(copia.id, copia.historialActivoId);
    } catch (err) {
      logError("Error registrando la devolución:", err);
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
      logError("Error eliminando el libro:", err);
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
      logError("Error publicando la reseña:", err);
      toast.error("No pudimos publicar la reseña.");
    }
  }

  function handleDatosEncontrados(datos: DatosComunidad) {
    setFormEdit((f) => ({
      ...f,
      titulo: datos.titulo || f.titulo,
      subtitulo: datos.subtitulo ?? f.subtitulo,
      autor: datos.autor || f.autor,
      editorial: datos.editorial ?? f.editorial,
      anio: datos.anio ?? f.anio,
      paginas: datos.paginas ?? f.paginas,
      volumen: datos.volumen ?? f.volumen,
      idioma: datos.idioma ?? f.idioma,
      genero: datos.genero ?? f.genero,
      sinopsis: datos.sinopsis ?? f.sinopsis,
    }));
    if (datos.portadaUrl && !global?.portadaUrl) {
      handleActualizarPortada(datos.portadaUrl);
    }
  }

  async function handleActualizarPortada(url: string) {
    if (!copia) return;
    try {
      await actualizarPortada(copia.isbn, url);
    } catch (err) {
      logError("Error actualizando la portada:", err);
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
                  logError("Error actualizando favorito:", err);
                  toast.error("No pudimos actualizar el favorito.");
                })
              }
              className={cn(
                "flex size-8 items-center justify-center rounded-md border text-muted-foreground",
                copia.favorito && "text-amber-500"
              )}
            >
              <Star
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
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Datos del libro
              </div>
              <button
                onClick={handleEmpezarEdicion}
                className="flex items-center gap-1 text-xs font-semibold text-primary underline"
              >
                <Pencil className="size-3" />
                Editar
              </button>
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
            {global?.volumen && (
              <div>
                <strong>Volumen:</strong> {global.volumen}
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
                <RatingCaraPicker value={estrellas} onChange={setEstrellas} />
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
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {r.usuarioNombre}
                    <RatingCara estrellas={r.estrellas} />
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
              {bibliotecaActual?.modoSocios ? (
                <Select value={loanSocioId} onValueChange={setLoanSocioId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un socio" />
                  </SelectTrigger>
                  <SelectContent>
                    {socios.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No hay socios cargados todavía.
                      </div>
                    ) : (
                      socios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  placeholder="Nombre"
                />
              )}
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
                    logError("Error actualizando leído:", err);
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
        onSeleccionar={handleActualizarPortada}
      />

      <Dialog
        open={editando}
        onOpenChange={(open) => !open && !guardandoEdicion && setEditando(false)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar datos</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <BuscarMasInformacion
              isbn={copia.isbn}
              idiomasLectura={localeLectura}
              onEncontrado={handleDatosEncontrados}
            />

            <FieldEdit label="Título">
              <Input
                value={formEdit.titulo}
                onChange={(e) => setCampoEdit("titulo", e.target.value)}
              />
            </FieldEdit>
            <FieldEdit label="Subtítulo">
              <Input
                value={formEdit.subtitulo}
                onChange={(e) => setCampoEdit("subtitulo", e.target.value)}
              />
            </FieldEdit>
            <FieldEdit label="Autor(es)">
              <Input
                value={formEdit.autor}
                onChange={(e) => setCampoEdit("autor", e.target.value)}
                list="sugerencias-autor"
              />
            </FieldEdit>
            <div className="flex gap-3">
              <FieldEdit label="Editorial" className="flex-[2]">
                <Input
                  value={formEdit.editorial}
                  onChange={(e) => setCampoEdit("editorial", e.target.value)}
                  list="sugerencias-editorial"
                />
              </FieldEdit>
              <FieldEdit label="Año" className="w-24">
                <Input
                  value={formEdit.anio}
                  onChange={(e) => setCampoEdit("anio", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label="Páginas" className="w-24">
                <Input
                  value={formEdit.paginas}
                  onChange={(e) => setCampoEdit("paginas", e.target.value)}
                />
              </FieldEdit>
              <FieldEdit label="Volumen" className="w-24">
                <Input
                  placeholder="Tomo 1"
                  value={formEdit.volumen}
                  onChange={(e) => setCampoEdit("volumen", e.target.value)}
                />
              </FieldEdit>
            </div>
            <div className="flex gap-3">
              <FieldEdit label="Género" className="flex-1">
                <GeneroSelect
                  value={formEdit.genero}
                  onValueChange={(v) => setCampoEdit("genero", v)}
                />
              </FieldEdit>
              <FieldEdit label="Idioma" className="w-40">
                <IdiomaSelect
                  value={formEdit.idioma}
                  onValueChange={(v) => setCampoEdit("idioma", v)}
                />
              </FieldEdit>
            </div>
            <FieldEdit label="Sinopsis">
              <Textarea
                rows={3}
                value={formEdit.sinopsis}
                onChange={(e) => setCampoEdit("sinopsis", e.target.value)}
              />
            </FieldEdit>

            <div className="mt-1 border-t pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Tu copia
            </div>
            <div className="flex gap-3">
              <FieldEdit label="Estante" className="flex-1">
                {bibliotecaActual && bibliotecaActual.estantes.length > 0 ? (
                  <Select
                    value={formEdit.estante}
                    onValueChange={(v) => setCampoEdit("estante", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Elegí un estante" />
                    </SelectTrigger>
                    <SelectContent>
                      {bibliotecaActual.estantes.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formEdit.estante}
                    onChange={(e) => setCampoEdit("estante", e.target.value)}
                  />
                )}
              </FieldEdit>
              <FieldEdit label="Tipo de tapa" className="flex-1">
                <Input
                  value={formEdit.tipoTapa}
                  onChange={(e) => setCampoEdit("tipoTapa", e.target.value)}
                />
              </FieldEdit>
            </div>
            <FieldEdit label="Notas privadas">
              <Input
                value={formEdit.notas}
                onChange={(e) => setCampoEdit("notas", e.target.value)}
              />
            </FieldEdit>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditando(false)}
              disabled={guardandoEdicion}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardarEdicion} disabled={guardandoEdicion}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <datalist id="sugerencias-autor">
        {sugerenciasAutor.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id="sugerencias-editorial">
        {sugerenciasEditorial.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
    </Sheet>
  );
}

function FieldEdit({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
