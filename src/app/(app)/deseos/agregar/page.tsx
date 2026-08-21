"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Heart, Loader2, PenLine, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn, normalizarBusqueda } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { useLibrosGlobales } from "@/hooks/use-libros-globales";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import { logError } from "@/lib/log";
import {
  agregarDeseo,
  getLibroGlobal,
  getSeleccionSemanal,
  listenInventario,
  toggleFavorito,
} from "@/lib/firestore/libros";
import { listenDeseos, type Deseo } from "@/lib/firestore/deseos";
import {
  buscarPorIsbn,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";
import { BarcodeScanner } from "@/components/catalogo/barcode-scanner";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarPorTitulo } from "@/components/catalogo/buscar-por-titulo";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

type Tab = "biblioteca" | "buscar";
type Paso = "elegir" | "formulario";

/** Deja solo los caracteres válidos de un ISBN y lo corta a 13 (ISBN-13). */
function sanitizarIsbn(valor: string): string {
  return valor.replace(/[^0-9Xx]/g, "").slice(0, 13);
}

const FORM_INICIAL = {
  titulo: "",
  subtitulo: "",
  autor: "",
  ilustrador: "",
  editorial: "",
  anio: "",
  volumen: "",
  genero: "",
  idioma: "",
  sinopsis: "",
  portadaUrl: "",
};

export default function AgregarDeseoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { bibliotecaActual } = useBiblioteca();
  const { localeLectura, t } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();

  const [tab, setTab] = useState<Tab>("biblioteca");
  const [copias, setCopias] = useState<LibroEnBiblioteca[]>([]);
  const [deseos, setDeseos] = useState<Deseo[]>([]);
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState("");

  const [sugeridos, setSugeridos] = useState<LibroGlobal[] | null>(null);
  const [agregandoIsbn, setAgregandoIsbn] = useState<string | null>(null);

  const [paso, setPaso] = useState<Paso>("elegir");
  const [isbnInput, setIsbnInput] = useState("");
  const [isbn, setIsbn] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comunidad, setComunidad] = useState<LibroGlobal | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [escaneando, setEscaneando] = useState(false);
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);

  useEffect(() => {
    if (!bibliotecaActual) {
      setCopias([]);
      return;
    }
    return listenInventario(bibliotecaActual.id, setCopias);
  }, [bibliotecaActual]);

  useEffect(() => {
    if (!user) return;
    return listenDeseos(user.uid, setDeseos);
  }, [user]);

  const isbnsPropios = useMemo(() => copias.map((c) => c.isbn), [copias]);
  const isbnsDeseados = useMemo(() => new Set(deseos.map((d) => d.isbn)), [deseos]);

  useEffect(() => {
    if (tab !== "buscar" || sugeridos !== null) return;
    getSeleccionSemanal(isbnsPropios).then(setSugeridos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const sinFavorito = useMemo(() => copias.filter((c) => !c.favorito), [copias]);
  const isbnsBiblioteca = useMemo(() => sinFavorito.map((c) => c.isbn), [sinFavorito]);
  const globalesBiblioteca = useLibrosGlobales(isbnsBiblioteca);

  const filtradosBiblioteca = useMemo(() => {
    const term = normalizarBusqueda(busquedaBiblioteca.trim());
    if (!term) return sinFavorito;
    return sinFavorito.filter((c) => {
      const g = globalesBiblioteca[c.isbn];
      const haystack = normalizarBusqueda(`${g?.titulo ?? ""} ${g?.autor ?? ""}`);
      return haystack.includes(term);
    });
  }, [sinFavorito, globalesBiblioteca, busquedaBiblioteca]);

  const sugeridosFiltrados = (sugeridos ?? []).filter((l) => !isbnsDeseados.has(l.isbn));

  async function handleAgregarDesdeMiBiblioteca(copia: LibroEnBiblioteca) {
    try {
      await toggleFavorito(copia.id, true);
    } catch (err) {
      logError("Error agregando a la lista de deseos:", err);
      toast.error(t("deseosAgregar.errorAgregando"));
    }
  }

  async function handleAgregarSugerido(libro: LibroGlobal) {
    if (!user) return;
    setAgregandoIsbn(libro.isbn);
    try {
      await agregarDeseo(libro.isbn, user.uid, {
        titulo: libro.titulo,
        subtitulo: libro.subtitulo,
        autor: libro.autor,
        ilustrador: libro.ilustrador,
        editorial: libro.editorial,
        anio: libro.anio,
        paginas: libro.paginas,
        volumen: libro.volumen,
        idioma: libro.idioma,
        genero: libro.genero,
        sinopsis: libro.sinopsis,
        portadaUrl: libro.portadaUrl,
      });
      toast.success(t("deseosAgregar.agregadoExito"));
    } catch (err) {
      logError("Error agregando sugerido a la lista de deseos:", err);
      toast.error(t("deseosAgregar.errorAgregando"));
    } finally {
      setAgregandoIsbn(null);
    }
  }

  function setCampo<K extends keyof typeof FORM_INICIAL>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function buscar(codigo: string) {
    if (!codigo) {
      toast.error(t("deseosAgregar.ingresarIsbn"));
      return;
    }
    setBuscando(true);
    try {
      const local = await getLibroGlobal(codigo);
      if (local) {
        setComunidad(local);
        setForm({
          titulo: local.titulo,
          subtitulo: local.subtitulo ?? "",
          autor: local.autor,
          ilustrador: local.ilustrador ?? "",
          editorial: local.editorial ?? "",
          anio: local.anio ?? "",
          volumen: local.volumen ?? "",
          genero: local.genero ?? "",
          idioma: local.idioma ?? "",
          sinopsis: local.sinopsis ?? "",
          portadaUrl: local.portadaUrl ?? "",
        });
      } else {
        try {
          const encontrado = await buscarPorIsbn(codigo, localeLectura);
          if (encontrado) {
            setForm({
              ...FORM_INICIAL,
              titulo: encontrado.titulo ?? "",
              subtitulo: encontrado.subtitulo ?? "",
              autor: encontrado.autor ?? "",
              editorial: encontrado.editorial ?? "",
              anio: encontrado.anio ?? "",
              idioma: encontrado.idioma ?? "",
              genero: encontrado.genero ?? "",
              sinopsis: encontrado.sinopsis ?? "",
              portadaUrl: encontrado.portadaUrl ?? "",
            });
          } else {
            toast.error(t("deseosAgregar.isbnNoEncontrado"));
            setForm({ ...FORM_INICIAL });
          }
        } catch (err) {
          logError("Error consultando el ISBN:", err);
          toast.error(mensajeErrorBusqueda(err, t("deseosAgregar.errorConsultaIsbn")));
          setForm({ ...FORM_INICIAL });
        }
      }
      setIsbn(codigo);
      setPaso("formulario");
    } catch (err) {
      logError("Error buscando ISBN:", err);
      toast.error(t("deseosAgregar.errorBuscarIsbn"));
    } finally {
      setBuscando(false);
    }
  }

  function handleBuscar() {
    buscar(isbnInput.trim());
  }

  function handleDetected(codigoCrudo: string) {
    const codigo = sanitizarIsbn(codigoCrudo);
    setEscaneando(false);
    setIsbnInput(codigo);
    buscar(codigo);
  }

  function handleIsbnInputChange(valor: string) {
    setIsbnInput(sanitizarIsbn(valor));
  }

  const largoAnteriorRef = useRef(0);
  useEffect(() => {
    const largo = isbnInput.length;
    if (
      tab === "buscar" &&
      paso === "elegir" &&
      !buscando &&
      (largo === 10 || largo === 13) &&
      largo !== largoAnteriorRef.current
    ) {
      buscar(isbnInput);
    }
    largoAnteriorRef.current = largo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbnInput]);

  function handleManual() {
    setIsbn("");
    setComunidad(null);
    setForm(FORM_INICIAL);
    setPaso("formulario");
  }

  function handleSeleccionarPorTitulo(resultado: ResultadoBusquedaTitulo) {
    if (resultado.isbn) {
      setIsbnInput(resultado.isbn);
      buscar(resultado.isbn);
      return;
    }
    setIsbn("");
    setComunidad(null);
    setForm({
      ...FORM_INICIAL,
      titulo: resultado.titulo ?? "",
      subtitulo: resultado.subtitulo ?? "",
      autor: resultado.autor ?? "",
      editorial: resultado.editorial ?? "",
      anio: resultado.anio ?? "",
      idioma: resultado.idioma ?? "",
      genero: resultado.genero ?? "",
      sinopsis: resultado.sinopsis ?? "",
      portadaUrl: resultado.portadaUrl ?? "",
    });
    setPaso("formulario");
  }

  async function handleGuardar() {
    if (!user) return;
    if (!(form.titulo ?? "").trim()) {
      toast.error(t("deseosAgregar.tituloObligatorio"));
      return;
    }

    const isbnFinal = isbn || `manual-${crypto.randomUUID()}`;

    setGuardando(true);
    try {
      await agregarDeseo(isbnFinal, user.uid, {
        titulo: (form.titulo ?? "").trim(),
        subtitulo: (form.subtitulo ?? "").trim() || undefined,
        autor: (form.autor ?? "").trim(),
        ilustrador: (form.ilustrador ?? "").trim() || undefined,
        editorial: (form.editorial ?? "").trim() || undefined,
        anio: (form.anio ?? "").trim() || undefined,
        volumen: (form.volumen ?? "").trim() || undefined,
        idioma: (form.idioma ?? "").trim() || undefined,
        genero: (form.genero ?? "").trim() || undefined,
        sinopsis: (form.sinopsis ?? "").trim() || undefined,
        portadaUrl: (form.portadaUrl ?? "").trim() || undefined,
      });

      toast.success(t("deseosAgregar.agregadoExito"));
      router.push("/deseos");
    } catch (err) {
      logError("Error guardando el deseo:", err);
      const mensaje = err instanceof Error ? err.message : String(err);
      toast.error(t("deseosAgregar.errorGuardar", { mensaje }));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <button
          onClick={() => router.push("/deseos")}
          className="flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("deseosAgregar.volverADeseos")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-2xl font-bold">{t("deseosAgregar.titulo")}</h1>
      </div>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        {t("deseosAgregar.subtitulo")}
      </p>

      {paso === "elegir" && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("biblioteca")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium text-muted-foreground",
              tab === "biblioteca" && "border-foreground bg-foreground text-background"
            )}
          >
            {t("deseosAgregar.tabBiblioteca")}
          </button>
          <button
            onClick={() => setTab("buscar")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium text-muted-foreground",
              tab === "buscar" && "border-foreground bg-foreground text-background"
            )}
          >
            {t("deseosAgregar.tabBuscar")}
          </button>
        </div>
      )}

      {paso === "elegir" && tab === "biblioteca" && (
        <div className="flex flex-col gap-4">
          <SearchInput
            placeholder={t("deseosAgregar.buscarEnMiBiblioteca")}
            value={busquedaBiblioteca}
            onValueChange={setBusquedaBiblioteca}
            className="max-w-sm"
          />
          {filtradosBiblioteca.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {sinFavorito.length === 0
                ? t("deseosAgregar.miBibliotecaVacia")
                : t("deseosAgregar.sinResultadosBiblioteca")}
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
            {filtradosBiblioteca.map((copia) => {
              const g = globalesBiblioteca[copia.isbn];
              const inicial = (g?.titulo ?? "?").trim().charAt(0).toUpperCase();
              return (
                <div key={copia.id} className="flex flex-col gap-2">
                  {g?.portadaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.portadaUrl}
                      alt={g.titulo}
                      className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                      <span className="text-2xl font-bold text-muted-foreground/60">
                        {inicial}
                      </span>
                    </div>
                  )}
                  <div className="text-[13px] font-semibold leading-tight">{g?.titulo}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground" title={g?.autor}>
                    {g?.autor}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAgregarDesdeMiBiblioteca(copia)}
                  >
                    <Heart className="size-3.5" />
                    {t("deseosAgregar.agregar")}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {paso === "elegir" && tab === "buscar" && (
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("deseosAgregar.sugeridosTitulo")}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("deseosAgregar.sugeridosDescripcion")}
            </p>
            {sugeridos === null ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4.2] animate-pulse rounded-lg border bg-muted"
                  />
                ))}
              </div>
            ) : sugeridosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("deseosAgregar.sinSugeridos")}
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                {sugeridosFiltrados.map((libro) => {
                  const inicial = libro.titulo.trim().charAt(0).toUpperCase();
                  return (
                    <div key={libro.isbn} className="flex flex-col gap-2">
                      {libro.portadaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={libro.portadaUrl}
                          alt={libro.titulo}
                          className="aspect-[3/4.2] w-full rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[3/4.2] items-center justify-center rounded-lg border bg-muted">
                          <span className="text-xl font-bold text-muted-foreground/60">
                            {inicial}
                          </span>
                        </div>
                      )}
                      <div className="text-xs font-semibold leading-tight">{libro.titulo}</div>
                      <div
                        className="line-clamp-1 text-[11px] text-muted-foreground"
                        title={libro.autor}
                      >
                        {libro.autor}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={agregandoIsbn === libro.isbn}
                        onClick={() => handleAgregarSugerido(libro)}
                      >
                        <Heart className="size-3.5" />
                        {t("deseosAgregar.agregar")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("deseosAgregar.buscarNuevoTitulo")}
            </div>
            <div className="flex flex-col gap-4">
              {escaneando ? (
                <BarcodeScanner onDetected={handleDetected} />
              ) : (
                <Button variant="outline" onClick={() => setEscaneando(true)}>
                  <ScanBarcode />
                  {t("deseosAgregar.escanear")}
                </Button>
              )}
              {escaneando && (
                <Button variant="ghost" size="sm" onClick={() => setEscaneando(false)}>
                  {t("deseosAgregar.cancelarEscaneo")}
                </Button>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("deseosAgregar.oIngresarIsbn")}
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("deseosAgregar.placeholderIsbn")}
                  inputMode="numeric"
                  maxLength={13}
                  value={isbnInput}
                  onChange={(e) => handleIsbnInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                />
                <Button onClick={handleBuscar} disabled={buscando}>
                  {buscando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t("deseosAgregar.buscar")
                  )}
                </Button>
              </div>
              {buscando && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("deseosAgregar.buscandoLibro")}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("deseosAgregar.oBuscarPorTitulo")}
                <div className="h-px flex-1 bg-border" />
              </div>
              <BuscarPorTitulo
                idiomasLectura={localeLectura}
                onSeleccionar={handleSeleccionarPorTitulo}
              />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("deseosAgregar.o")}
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" onClick={handleManual}>
                <PenLine />
                {t("deseosAgregar.cargarManualmente")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {paso === "formulario" && (
        <div className="flex flex-col gap-4">
          {comunidad && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <span className="font-semibold">{t("deseosAgregar.yaEstaComunidad")} </span>
              {t("deseosAgregar.comunidadInfo", {
                propietarios: comunidad.propietarios,
                rating: comunidad.ratingPromedio,
              })}
            </div>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("deseosAgregar.datosComunidad")}
          </div>

          <div className="flex items-center gap-3">
            {form.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.portadaUrl}
                alt={t("deseosAgregar.portadaAlt")}
                className="h-[130px] w-[88px] rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                {t("deseosAgregar.sinPortada")}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {form.portadaUrl ? t("deseosAgregar.cambiarPortada") : t("deseosAgregar.buscarPortada")}
            </Button>
          </div>

          <Field label={t("deseosAgregar.campoIsbn")}>
            <Input
              inputMode="numeric"
              maxLength={13}
              value={isbn}
              onChange={(e) => setIsbn(sanitizarIsbn(e.target.value))}
            />
          </Field>
          <Field label={t("deseosAgregar.campoTitulo")}>
            <Input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} />
          </Field>
          <Field label={t("deseosAgregar.campoAutor")}>
            <Input
              placeholder={t("deseosAgregar.separadosPorComa")}
              value={form.autor}
              onChange={(e) => setCampo("autor", e.target.value)}
              list="sugerencias-autor"
            />
          </Field>
          <Field label={t("deseosAgregar.campoIlustrador")}>
            <Input
              placeholder={t("deseosAgregar.separadosPorComa")}
              value={form.ilustrador}
              onChange={(e) => setCampo("ilustrador", e.target.value)}
            />
          </Field>
          <div className="flex gap-3">
            <Field label={t("deseosAgregar.campoEditorial")} className="flex-[2]">
              <Input
                value={form.editorial}
                onChange={(e) => setCampo("editorial", e.target.value)}
                list="sugerencias-editorial"
              />
            </Field>
            <Field label={t("deseosAgregar.campoAnio")} className="w-[90px]">
              <Input value={form.anio} onChange={(e) => setCampo("anio", e.target.value)} />
            </Field>
            <Field label={t("deseosAgregar.campoVolumen")} className="w-[110px]">
              <Input
                placeholder={t("deseosAgregar.tomoPlaceholder")}
                value={form.volumen}
                onChange={(e) => setCampo("volumen", e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("deseosAgregar.campoGenero")}>
            <GeneroSelect value={form.genero} onValueChange={(v) => setCampo("genero", v)} />
          </Field>
          <Field label={t("deseosAgregar.campoSinopsis")}>
            <Textarea
              rows={3}
              value={form.sinopsis}
              onChange={(e) => setCampo("sinopsis", e.target.value)}
            />
          </Field>
        </div>
      )}

      {paso === "formulario" && (
        <div className="sticky bottom-0 -mx-5 -mb-24 flex gap-2.5 border-t bg-background px-5 pt-3 pb-24 md:-mx-12 md:-mb-12 md:px-12 md:pb-3">
          <Button variant="outline" onClick={() => setPaso("elegir")}>
            {t("deseosAgregar.cancelar")}
          </Button>
          <Button className="flex-1" onClick={handleGuardar} disabled={guardando}>
            {t("deseosAgregar.agregarADeseos")}
          </Button>
        </div>
      )}

      <PortadaPicker
        open={portadaPickerOpen}
        onOpenChange={setPortadaPickerOpen}
        consultaInicial={form.titulo || form.autor}
        onSeleccionar={(url) => setCampo("portadaUrl", url)}
      />

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
    </div>
  );
}

function Field({
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
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
