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
import { logError, logSuccess } from "@/lib/log";

const TOTAL_PASOS = 3;

function nombreSugerido(
  displayName: string | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  return displayName
    ? t("onboarding.bibliotecaDe", { nombre: displayName.split(" ")[0] })
    : t("onboarding.bibliotecaPorDefecto");
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const { crearYSeleccionar } = useBiblioteca();
  const { localeLectura, setLocaleLectura, t } = useLocale();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState(() => nombreSugerido(user?.displayName, t));
  const [generos, setGeneros] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  async function handleFinalizar() {
    if (!user) return;
    setGuardando(true);
    try {
      await guardarPerfil(user.uid, { generosFavoritos: generos });
      logSuccess("Perfil guardado (géneros favoritos).", { uid: user.uid, generos });
      await crearYSeleccionar(nombre.trim() || t("onboarding.bibliotecaPorDefecto"));
      logSuccess("Biblioteca creada.", { nombre });
    } catch (err) {
      logError("Error configurando la cuenta:", err);
      toast.error(t("onboarding.errorCreando"));
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
                  {t("onboarding.pasoDe", { paso: 1, total: TOTAL_PASOS })}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{t("onboarding.tituloPaso1")}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("onboarding.descripcionPaso1")}
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
                {t("onboarding.continuar")}
              </Button>
            </div>
          )}

          {paso === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("onboarding.pasoDe", { paso: 2, total: TOTAL_PASOS })}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{t("onboarding.tituloPaso2")}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("onboarding.descripcionPaso2")}
                </p>
              </div>
              <LocaleMultiSelect value={localeLectura} onChange={setLocaleLectura} />
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => setPaso(1)}>
                  {t("onboarding.atras")}
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setPaso(3)}>
                  {t("onboarding.continuar")}
                </Button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("onboarding.pasoDe", { paso: 3, total: TOTAL_PASOS })}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{t("onboarding.tituloPaso3")}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("onboarding.descripcionPaso3")}
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
                  {t("onboarding.atras")}
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleFinalizar}
                  disabled={guardando}
                >
                  {guardando ? t("onboarding.creando") : t("onboarding.empezar")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
