"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
import { LocaleMultiSelect } from "@/components/cuenta/locale-multi-select";
import { GeneroMultiSelect } from "@/components/cuenta/genero-multi-select";
import { GENERO_FRASES } from "@/lib/generos";
import { guardarPerfil } from "@/lib/firestore/perfiles";

const TOTAL_PASOS = 3;

function nombreSugerido(displayName: string | null | undefined): string {
  return displayName ? `Biblioteca de ${displayName.split(" ")[0]}` : "Mi biblioteca";
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const { crearYSeleccionar } = useBiblioteca();
  const { localeLectura, setLocaleLectura } = useLocale();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState(() => nombreSugerido(user?.displayName));
  const [generos, setGeneros] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  async function handleFinalizar() {
    if (!user) return;
    setGuardando(true);
    try {
      await guardarPerfil(user.uid, { generosFavoritos: generos });
      await crearYSeleccionar(nombre.trim() || "Mi biblioteca");
    } catch (err) {
      console.error("Error configurando la cuenta:", err);
      toast.error("No pudimos crear tu biblioteca. Probá de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-1.5 px-6 pt-6 sm:px-10">
        {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i + 1 <= paso ? "bg-foreground" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-md">
          {paso === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paso 1 de {TOTAL_PASOS}
                </p>
                <h1 className="mt-1 text-2xl font-bold">¿Cómo se llama tu biblioteca?</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Es el espacio donde vas a cargar tus libros. Podés cambiarlo
                  después desde Espacio compartido.
                </p>
              </div>
              <Input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nombre.trim() && setPaso(2)}
                className="h-11 text-base"
              />
              <Button size="lg" onClick={() => setPaso(2)} disabled={!nombre.trim()}>
                Continuar
              </Button>
            </div>
          )}

          {paso === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paso 2 de {TOTAL_PASOS}
                </p>
                <h1 className="mt-1 text-2xl font-bold">¿En qué idiomas leés?</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Podés elegir más de uno. Los usamos para priorizar los
                  resultados al buscar un libro.
                </p>
              </div>
              <LocaleMultiSelect value={localeLectura} onChange={setLocaleLectura} />
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => setPaso(1)}>
                  Atrás
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setPaso(3)}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paso 3 de {TOTAL_PASOS}
                </p>
                <h1 className="mt-1 text-2xl font-bold">¿Qué clase de lector sos?</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Elegí con lo que te identifiques. Opcional, y lo podés
                  cambiar cuando quieras desde Mi cuenta.
                </p>
              </div>
              <div className="max-h-[40vh] overflow-y-auto rounded-lg border p-3">
                <GeneroMultiSelect
                  value={generos}
                  onChange={setGeneros}
                  labels={GENERO_FRASES}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPaso(2)}
                  disabled={guardando}
                >
                  Atrás
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleFinalizar}
                  disabled={guardando}
                >
                  {guardando ? "Creando tu biblioteca…" : "Empezar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
