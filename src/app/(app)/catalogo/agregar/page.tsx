"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PenLine, Plus, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { logError } from "@/lib/log";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { useSugerenciasComunidad } from "@/hooks/use-sugerencias-comunidad";
import {
  agregarLibroABiblioteca,
  contarCopiasDelIsbn,
  getLibroGlobal,
} from "@/lib/firestore/libros";
import { agregarEstante } from "@/lib/firestore/bibliotecas";
import {
  buscarPorIsbn,
  mensajeErrorBusqueda,
  type ResultadoBusquedaTitulo,
} from "@/services/google-books";
import { BarcodeScanner } from "@/components/catalogo/barcode-scanner";
import { PortadaPicker } from "@/components/catalogo/portada-picker";
import { IdiomaSelect } from "@/components/catalogo/idioma-select";
import { GeneroSelect } from "@/components/catalogo/genero-select";
import { BuscarPorTitulo } from "@/components/catalogo/buscar-por-titulo";
import { BuscarMasInformacion } from "@/components/catalogo/buscar-mas-informacion";
import type { DatosComunidad } from "@/lib/firestore/libros";
import type { LibroGlobal } from "@/types";

type Paso = "buscar" | "formulario";

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
  paginas: "",
  volumen: "",
  genero: "",
  idioma: "",
  sinopsis: "",
  portadaUrl: "",
  estante: "",
  tipoTapa: "",
  notas: "",
};

export default function AgregarLibroPage() {
  const router = useRouter();
  const { bibliotecaActual } = useBiblioteca();
  const { localeLectura, t } = useLocale();
  const { autores: sugerenciasAutor, editoriales: sugerenciasEditorial } =
    useSugerenciasComunidad();
  const [paso, setPaso] = useState<Paso>("buscar");
  const [isbnInput, setIsbnInput] = useState("");
  const [isbn, setIsbn] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comunidad, setComunidad] = useState<LibroGlobal | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [escaneando, setEscaneando] = useState(false);
  const [portadaPickerOpen, setPortadaPickerOpen] = useState(false);
  const [cargaMultiple, setCargaMultiple] = useState(false);
  const [agregadosSesion, setAgregadosSesion] = useState(0);
  const [creandoEstante, setCreandoEstante] = useState(false);
  const [nuevoEstanteNombre, setNuevoEstanteNombre] = useState("");
  const estantes = bibliotecaActual?.estantes ?? [];
  // Guarda qué ISBN ya pasó por el aviso de "copia repetida" en buscar(),
  // para no volver a preguntar lo mismo al guardar.
  const isbnVerificadoRef = useRef<string | null>(null);

  // En mobile abrimos la cámara sola; en desktop/web queda apagada por
  // defecto (nadie quiere el permiso de cámara apenas entra a la página).
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setEscaneando(true);
    }
  }, []);

  function setCampo<K extends keyof typeof FORM_INICIAL>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function buscar(codigo: string) {
    if (!codigo) {
      toast.error(t("catalogoAgregar.ingresaIsbn"));
      return;
    }

    // Avisamos ANTES de cargar datos si ya tenés este libro, para no
    // hacerte llenar el formulario si en realidad no querías otra copia.
    if (bibliotecaActual) {
      try {
        const copiasExistentes = await contarCopiasDelIsbn(bibliotecaActual.id, codigo);
        if (copiasExistentes > 0) {
          const seguir = window.confirm(
            t("catalogoAgregar.confirmarCopiaExistente", { n: copiasExistentes })
          );
          if (!seguir) {
            setEscaneando(true);
            return;
          }
        }
        isbnVerificadoRef.current = codigo;
      } catch (err) {
        logError("Error chequeando copias existentes:", err);
      }
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
          paginas: local.paginas ?? "",
          volumen: local.volumen ?? "",
          genero: local.genero ?? "",
          idioma: local.idioma ?? "",
          sinopsis: local.sinopsis ?? "",
          portadaUrl: local.portadaUrl ?? "",
          estante: "",
          tipoTapa: "",
          notas: "",
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
              paginas: encontrado.paginas ?? "",
              idioma: encontrado.idioma ?? "",
              genero: encontrado.genero ?? "",
              sinopsis: encontrado.sinopsis ?? "",
              portadaUrl: encontrado.portadaUrl ?? "",
            });
          } else {
            toast.error(t("catalogoAgregar.errorIsbnNoEncontrado"));
            setForm({ ...FORM_INICIAL });
          }
        } catch (err) {
          logError("Error consultando el ISBN:", err);
          toast.error(
            mensajeErrorBusqueda(err, t("catalogoAgregar.errorConsultaIsbn"))
          );
          setForm({ ...FORM_INICIAL });
        }
      }
      setIsbn(codigo);
      setPaso("formulario");
    } catch (err) {
      logError("Error buscando ISBN:", err);
      toast.error(t("catalogoAgregar.errorBuscarIsbn"));
    } finally {
      setBuscando(false);
    }
  }

  function handleBuscar() {
    buscar(isbnInput.trim());
  }

  function handleDetected(codigoCrudo: string) {
    // Algunos libros (colecciones/volúmenes) traen un add-on de 5 dígitos
    // pegado al EAN-13 (código de 18 dígitos); nos quedamos con los
    // primeros 13, que son el ISBN real.
    const codigo = sanitizarIsbn(codigoCrudo);
    setEscaneando(false);
    setIsbnInput(codigo);
    buscar(codigo);
  }

  function handleIsbnInputChange(valor: string) {
    setIsbnInput(sanitizarIsbn(valor));
  }

  // Auto-búsqueda: apenas el ISBN tipeado llega a un largo válido (10 o 13
  // dígitos) buscamos solo, sin esperar que aprieten "Buscar".
  const largoAnteriorRef = useRef(0);
  useEffect(() => {
    const largo = isbnInput.length;
    if (
      paso === "buscar" &&
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
    setEscaneando(false);
    setPaso("formulario");
  }

  function handleSeleccionarPorTitulo(resultado: ResultadoBusquedaTitulo) {
    // Si Google nos dio el ISBN de esa edición, seguimos el flujo normal
    // (chequea copias existentes, prioriza los datos de la comunidad).
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
      paginas: resultado.paginas ?? "",
      idioma: resultado.idioma ?? "",
      genero: resultado.genero ?? "",
      sinopsis: resultado.sinopsis ?? "",
      portadaUrl: resultado.portadaUrl ?? "",
    });
    setEscaneando(false);
    setPaso("formulario");
  }

  function handleDatosEncontrados(datos: DatosComunidad) {
    setForm((f) => ({
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
      portadaUrl: datos.portadaUrl ?? f.portadaUrl,
    }));
  }

  async function handleCrearEstante() {
    if (!bibliotecaActual || !nuevoEstanteNombre.trim()) return;
    const nombre = nuevoEstanteNombre.trim();
    try {
      await agregarEstante(bibliotecaActual.id, nombre);
      setCampo("estante", nombre);
      setNuevoEstanteNombre("");
      setCreandoEstante(false);
      toast.success(t("catalogoAgregar.estanteCreado"));
    } catch (err) {
      logError("Error creando estante:", err);
      toast.error(t("catalogoAgregar.errorCrearEstante"));
    }
  }

  async function handleGuardar() {
    if (!bibliotecaActual) {
      toast.error(t("catalogoAgregar.errorSinBiblioteca"));
      return;
    }
    if (!(form.titulo ?? "").trim()) {
      toast.error(t("catalogoAgregar.errorTituloObligatorio"));
      return;
    }

    // Si el ISBN no pasó por buscar() (p.ej. lo escribieron directo en el
    // formulario tras "Cargar manualmente"), chequeamos acá como respaldo.
    if (isbn && isbn !== isbnVerificadoRef.current) {
      try {
        const copiasExistentes = await contarCopiasDelIsbn(bibliotecaActual.id, isbn);
        if (copiasExistentes > 0) {
          const seguir = window.confirm(
            t("catalogoAgregar.confirmarCopiaExistente", { n: copiasExistentes })
          );
          if (!seguir) return;
        }
      } catch (err) {
        logError("Error chequeando copias existentes:", err);
      }
    }

    // El ISBN es opcional: si no lo cargaron, generamos un identificador
    // propio para poder crear igual el libro comunitario y la copia.
    const isbnFinal = isbn || `manual-${crypto.randomUUID()}`;

    setGuardando(true);
    try {
      await agregarLibroABiblioteca(
        isbnFinal,
        bibliotecaActual.id,
        {
          titulo: (form.titulo ?? "").trim(),
          subtitulo: (form.subtitulo ?? "").trim() || undefined,
          autor: (form.autor ?? "").trim(),
          ilustrador: (form.ilustrador ?? "").trim() || undefined,
          editorial: (form.editorial ?? "").trim() || undefined,
          anio: (form.anio ?? "").trim() || undefined,
          paginas: (form.paginas ?? "").trim() || undefined,
          volumen: (form.volumen ?? "").trim() || undefined,
          idioma: (form.idioma ?? "").trim() || undefined,
          genero: (form.genero ?? "").trim() || undefined,
          sinopsis: (form.sinopsis ?? "").trim() || undefined,
          portadaUrl: (form.portadaUrl ?? "").trim() || undefined,
        },
        {
          estante: (form.estante ?? "").trim(),
          tipoTapa: (form.tipoTapa ?? "").trim() || undefined,
          notas: (form.notas ?? "").trim() || undefined,
        }
      );

      if (cargaMultiple) {
        const nuevoTotal = agregadosSesion + 1;
        setAgregadosSesion(nuevoTotal);
        toast.success(t("catalogoAgregar.agregadoSiguiente", { n: nuevoTotal }));
        setIsbn("");
        setIsbnInput("");
        setComunidad(null);
        setForm(FORM_INICIAL);
        setPaso("buscar");
        setEscaneando(true);
      } else {
        toast.success(t("catalogoAgregar.libroAgregado"));
        router.push("/catalogo");
      }
    } catch (err) {
      logError("Error guardando el libro:", err);
      const mensaje = err instanceof Error ? err.message : String(err);
      toast.error(t("catalogoAgregar.errorGuardarLibro", { mensaje }));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center gap-2">
        <button
          onClick={() => router.push("/catalogo")}
          className="flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("catalogoAgregar.volverCatalogo")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-2xl font-bold">{t("catalogoAgregar.titulo")}</h1>
      </div>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        {t("catalogoAgregar.subtitulo")}
      </p>

      <label className="mb-7 flex items-center gap-2 text-sm">
        <Checkbox
          checked={cargaMultiple}
          onCheckedChange={(v) => setCargaMultiple(v === true)}
        />
        {t("catalogoAgregar.cargaMultipleLabel")}
        {cargaMultiple && agregadosSesion > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("catalogoAgregar.agregadosEnSesion", { n: agregadosSesion })}
          </span>
        )}
      </label>

      <div className="flex-1 overflow-y-auto">
      {paso === "buscar" && (
        <div className="flex flex-col gap-4">
          {escaneando ? (
            <>
              <BarcodeScanner onDetected={handleDetected} />
              <Button variant="ghost" size="sm" onClick={() => setEscaneando(false)}>
                {t("catalogoAgregar.cancelarEscaneo")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEscaneando(true)}>
              <ScanBarcode />
              {t("catalogoAgregar.escanearCamara")}
            </Button>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("catalogoAgregar.oIngresaIsbn")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("catalogoAgregar.isbnPlaceholder")}
              inputMode="numeric"
              maxLength={13}
              value={isbnInput}
              onChange={(e) => handleIsbnInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
            <Button onClick={handleBuscar} disabled={buscando}>
              {buscando ? <Loader2 className="size-4 animate-spin" /> : t("catalogoAgregar.buscar")}
            </Button>
          </div>
          {buscando && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("catalogoAgregar.buscandoLibro")}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("catalogoAgregar.oBuscaPorTitulo")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <BuscarPorTitulo
            idiomasLectura={localeLectura}
            onSeleccionar={handleSeleccionarPorTitulo}
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t("catalogoAgregar.oSeparador")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={handleManual}>
            <PenLine />
            {t("catalogoAgregar.cargarManualmente")}
          </Button>
        </div>
      )}

      {paso === "formulario" && (
        <div className="flex flex-col gap-4 pb-4">
          {comunidad && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <span className="font-semibold">{t("catalogoAgregar.yaEstaComunidad")} </span>
              {t("catalogoAgregar.comunidadInfo", {
                propietarios: comunidad.propietarios,
                rating: comunidad.ratingPromedio,
              })}
            </div>
          )}

          <BuscarMasInformacion
            isbn={isbn}
            idiomasLectura={localeLectura}
            onEncontrado={handleDatosEncontrados}
          />

          <div className="flex items-center gap-3">
            {form.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.portadaUrl}
                alt={t("catalogoAgregar.portadaAlt")}
                className="h-[130px] w-[88px] rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-[130px] w-[88px] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                {t("catalogoAgregar.sinPortada")}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPortadaPickerOpen(true)}
            >
              {form.portadaUrl
                ? t("catalogoAgregar.cambiarPortada")
                : t("catalogoAgregar.buscarPortada")}
            </Button>
          </div>

          <Field label={t("catalogoAgregar.campoIsbn")}>
            <Input
              inputMode="numeric"
              maxLength={13}
              value={isbn}
              onChange={(e) => setIsbn(sanitizarIsbn(e.target.value))}
            />
          </Field>
          <Field label={t("catalogoAgregar.campoTitulo")}>
            <Input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} />
          </Field>
          <Field label={t("catalogoAgregar.campoAutor")}>
            <Input
              placeholder={t("catalogoAgregar.separadosPorComa")}
              value={form.autor}
              onChange={(e) => setCampo("autor", e.target.value)}
              list="sugerencias-autor"
            />
          </Field>
          <Field label={t("catalogoAgregar.campoIlustrador")}>
            <Input
              placeholder={t("catalogoAgregar.separadosPorComa")}
              value={form.ilustrador}
              onChange={(e) => setCampo("ilustrador", e.target.value)}
            />
          </Field>
          <Field label={t("catalogoAgregar.campoEstante")}>
            {creandoEstante ? (
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  value={nuevoEstanteNombre}
                  onChange={(e) => setNuevoEstanteNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrearEstante()}
                  placeholder={t("catalogoAgregar.nombreEstantePlaceholder")}
                />
                <Button type="button" onClick={handleCrearEstante}>
                  {t("catalogoAgregar.crear")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreandoEstante(false)}
                >
                  {t("catalogoAgregar.cancelar")}
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {estantes.length > 0 ? (
                  <Select value={form.estante} onValueChange={(v) => setCampo("estante", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("catalogoAgregar.elegiEstante")} />
                    </SelectTrigger>
                    <SelectContent>
                      {estantes.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex-1 pt-2 text-xs text-muted-foreground">
                    {t("catalogoAgregar.sinEstantes")}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCreandoEstante(true)}
                  aria-label={t("catalogoAgregar.crearEstanteAriaLabel")}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </Field>

          <div className="mt-2 border-t pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("catalogoAgregar.masDatos")}
          </div>
          <Field label={t("catalogoAgregar.campoSubtitulo")}>
            <Input value={form.subtitulo} onChange={(e) => setCampo("subtitulo", e.target.value)} />
          </Field>
          <Field label={t("catalogoAgregar.campoEditorial")}>
            <Input
              value={form.editorial}
              onChange={(e) => setCampo("editorial", e.target.value)}
              list="sugerencias-editorial"
            />
          </Field>
          <div className="flex gap-3">
            <Field label={t("catalogoAgregar.campoAnio")} className="flex-1">
              <Input value={form.anio} onChange={(e) => setCampo("anio", e.target.value)} />
            </Field>
            <Field label={t("catalogoAgregar.campoPaginas")} className="flex-1">
              <Input value={form.paginas} onChange={(e) => setCampo("paginas", e.target.value)} />
            </Field>
            <Field label={t("catalogoAgregar.campoVolumen")} className="flex-1">
              <Input
                placeholder={t("catalogoAgregar.tomoPlaceholder")}
                value={form.volumen}
                onChange={(e) => setCampo("volumen", e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <Field label={t("catalogoAgregar.campoGenero")} className="flex-1">
              <GeneroSelect value={form.genero} onValueChange={(v) => setCampo("genero", v)} />
            </Field>
            <Field label={t("catalogoAgregar.campoIdioma")} className="w-36">
              <IdiomaSelect value={form.idioma} onValueChange={(v) => setCampo("idioma", v)} />
            </Field>
          </div>
          <Field label={t("catalogoAgregar.campoSinopsis")}>
            <Textarea rows={3} value={form.sinopsis} onChange={(e) => setCampo("sinopsis", e.target.value)} />
          </Field>

          <div className="mt-2 border-t pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("catalogoAgregar.tuCopiaFisica")}
          </div>
          <Field label={t("catalogoAgregar.campoTipoTapa")}>
            <Input
              placeholder={t("catalogoAgregar.tapaBlandaPlaceholder")}
              value={form.tipoTapa}
              onChange={(e) => setCampo("tipoTapa", e.target.value)}
            />
          </Field>
          <Field label={t("catalogoAgregar.campoNotas")}>
            <Input
              placeholder={t("catalogoAgregar.notasPlaceholder")}
              value={form.notas}
              onChange={(e) => setCampo("notas", e.target.value)}
            />
          </Field>

        </div>
      )}
      </div>

      {paso === "formulario" && (
        <div className="-mx-5 mt-4 flex gap-2.5 border-t bg-background px-5 pt-3 pb-3 md:-mx-12 md:px-12">
          <Button variant="outline" onClick={() => setPaso("buscar")}>
            {t("catalogoAgregar.cancelar")}
          </Button>
          <Button className="flex-1" onClick={handleGuardar} disabled={guardando}>
            {t("catalogoAgregar.agregar")}
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
