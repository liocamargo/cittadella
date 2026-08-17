"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { getLibroGlobal, agregarLibroABiblioteca } from "@/lib/firestore/libros";
import { buscarPorIsbn } from "@/services/google-books";
import type { LibroGlobal } from "@/types";

type Paso = "buscar" | "formulario";

const FORM_INICIAL = {
  titulo: "",
  subtitulo: "",
  autor: "",
  editorial: "",
  anio: "",
  paginas: "",
  genero: "",
  idioma: "",
  sinopsis: "",
  estante: "",
  tipoTapa: "",
  notas: "",
};

export default function AgregarLibroPage() {
  const router = useRouter();
  const { bibliotecaActual } = useBiblioteca();
  const [paso, setPaso] = useState<Paso>("buscar");
  const [isbnInput, setIsbnInput] = useState("");
  const [isbn, setIsbn] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comunidad, setComunidad] = useState<LibroGlobal | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);

  function setCampo<K extends keyof typeof FORM_INICIAL>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleBuscar() {
    const codigo = isbnInput.trim();
    if (!codigo) {
      toast.error("Ingresá un ISBN.");
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
          editorial: local.editorial ?? "",
          anio: local.anio ?? "",
          paginas: local.paginas ?? "",
          genero: local.genero ?? "",
          idioma: local.idioma ?? "",
          sinopsis: local.sinopsis ?? "",
          estante: "",
          tipoTapa: "",
          notas: "",
        });
      } else {
        const google = await buscarPorIsbn(codigo);
        if (google) {
          setForm({ ...FORM_INICIAL, ...google });
        } else {
          toast.error("No encontramos ese ISBN. Cargalo manualmente.");
          setForm(FORM_INICIAL);
        }
      }
      setIsbn(codigo);
      setPaso("formulario");
    } catch {
      toast.error("No pudimos buscar el ISBN. Probá de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  function handleManual() {
    setIsbn("");
    setComunidad(null);
    setForm(FORM_INICIAL);
    setPaso("formulario");
  }

  async function handleGuardar() {
    if (!bibliotecaActual) {
      toast.error("Todavía no tenés una biblioteca activa.");
      return;
    }
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const isbnFinal = isbn || `manual-${crypto.randomUUID()}`;
      await agregarLibroABiblioteca(
        isbnFinal,
        bibliotecaActual.id,
        {
          titulo: form.titulo.trim(),
          subtitulo: form.subtitulo.trim() || undefined,
          autor: form.autor.trim(),
          editorial: form.editorial.trim() || undefined,
          anio: form.anio.trim() || undefined,
          paginas: form.paginas.trim() || undefined,
          idioma: form.idioma.trim() || undefined,
          genero: form.genero.trim() || undefined,
          sinopsis: form.sinopsis.trim() || undefined,
        },
        {
          estante: form.estante.trim(),
          tipoTapa: form.tipoTapa.trim() || undefined,
          notas: form.notas.trim() || undefined,
        }
      );
      toast.success("Libro agregado a tu biblioteca.");
      router.push("/catalogo");
    } catch {
      toast.error("No pudimos guardar el libro.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Agregar libro</h1>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">
        Buscá por ISBN o cargalo manualmente.
      </p>

      {paso === "buscar" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="978-..."
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            />
            <Button onClick={handleBuscar} disabled={buscando}>
              Buscar
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />o<div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={handleManual}>
            <PenLine />
            Cargar manualmente sin código
          </Button>
        </div>
      )}

      {paso === "formulario" && (
        <div className="flex flex-col gap-4">
          {comunidad && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <span className="font-semibold">Ya está en la comunidad: </span>
              {comunidad.propietarios} biblioteca(s) lo tienen · ★{" "}
              {comunidad.ratingPromedio} promedio
            </div>
          )}

          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Datos del libro (comunidad)
          </div>

          <Field label="Título">
            <Input value={form.titulo} onChange={(e) => setCampo("titulo", e.target.value)} />
          </Field>
          <Field label="Subtítulo (opcional)">
            <Input value={form.subtitulo} onChange={(e) => setCampo("subtitulo", e.target.value)} />
          </Field>
          <Field label="Autor(es)">
            <Input
              placeholder="separados por coma"
              value={form.autor}
              onChange={(e) => setCampo("autor", e.target.value)}
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Editorial" className="flex-[2]">
              <Input value={form.editorial} onChange={(e) => setCampo("editorial", e.target.value)} />
            </Field>
            <Field label="Año" className="w-[90px]">
              <Input value={form.anio} onChange={(e) => setCampo("anio", e.target.value)} />
            </Field>
            <Field label="Páginas" className="w-[90px]">
              <Input value={form.paginas} onChange={(e) => setCampo("paginas", e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-3">
            <Field label="Género (opcional)" className="flex-1">
              <Input value={form.genero} onChange={(e) => setCampo("genero", e.target.value)} />
            </Field>
            <Field label="Idioma" className="w-[100px]">
              <Input placeholder="es" value={form.idioma} onChange={(e) => setCampo("idioma", e.target.value)} />
            </Field>
          </div>
          <Field label="Sinopsis (opcional)">
            <Textarea rows={3} value={form.sinopsis} onChange={(e) => setCampo("sinopsis", e.target.value)} />
          </Field>

          <div className="mt-2 border-t pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Tu copia física
          </div>
          <div className="flex gap-3">
            <Field label="Estante" className="flex-1">
              <Input
                placeholder="Estante A"
                value={form.estante}
                onChange={(e) => setCampo("estante", e.target.value)}
              />
            </Field>
            <Field label="Tipo de tapa" className="flex-1">
              <Input
                placeholder="Tapa blanda"
                value={form.tipoTapa}
                onChange={(e) => setCampo("tipoTapa", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notas privadas (opcional)">
            <Input
              placeholder="ej: firmado por el autor"
              value={form.notas}
              onChange={(e) => setCampo("notas", e.target.value)}
            />
          </Field>

          <div className="mt-2 flex gap-2.5">
            <Button variant="outline" onClick={() => setPaso("buscar")}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleGuardar} disabled={guardando}>
              Agregar
            </Button>
          </div>
        </div>
      )}
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
