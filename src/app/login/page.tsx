"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

type Step = "start" | "sent" | "completing" | "need-email";

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    signInWithGoogle,
    sendLoginLink,
    isEmailSignInLink,
    completeEmailLinkSignIn,
  } = useAuth();

  const [step, setStep] = useState<Step>(() =>
    typeof window !== "undefined" && isEmailSignInLink(window.location.href)
      ? "completing"
      : "start"
  );
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/inicio");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (step !== "completing") return;

    completeEmailLinkSignIn(window.location.href)
      .then(() => router.replace("/inicio"))
      .catch((err) => {
        if (err instanceof Error && err.message === "NEEDS_EMAIL") {
          setStep("need-email");
        } else {
          toast.error("No pudimos completar el ingreso. Probá de nuevo.");
          setStep("start");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/inicio");
    } catch (err) {
      console.error("Error con Google Sign-In:", err);
      toast.error("No pudimos iniciar sesión con Google.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendLink() {
    if (!email.trim()) {
      toast.error("Ingresá tu correo.");
      return;
    }
    setSubmitting(true);
    try {
      await sendLoginLink(email.trim());
      setStep("sent");
    } catch (err) {
      console.error("Error enviando el link de acceso:", err);
      toast.error("No pudimos enviar el link. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmEmail() {
    if (!confirmEmail.trim()) {
      toast.error("Ingresá tu correo para confirmar.");
      return;
    }
    setSubmitting(true);
    try {
      await completeEmailLinkSignIn(window.location.href, confirmEmail.trim());
      router.replace("/inicio");
    } catch (err) {
      console.error("Error completando el login por email link:", err);
      toast.error("El link no es válido o expiró. Pedí uno nuevo.");
      setStep("start");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-xl border bg-card p-9 shadow-sm">
        <div>
          <div className="mb-4 h-9 w-9 rounded-lg bg-primary" />
          <h1 className="text-[22px] font-semibold text-foreground">
            Cittadella
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo compartido de tu biblioteca
          </p>
        </div>

        {step === "start" && (
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="justify-center gap-2.5 py-5.5"
              onClick={handleGoogle}
              disabled={submitting}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{
                  background:
                    "conic-gradient(oklch(60% 0.15 30) 0 25%, oklch(60% 0.15 145) 25% 50%, oklch(60% 0.15 255) 50% 75%, oklch(75% 0.14 90) 75% 100%)",
                }}
              />
              Continuar con Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              o con tu correo
              <div className="h-px flex-1 bg-border" />
            </div>

            <Input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <Button onClick={handleSendLink} disabled={submitting}>
              Enviar link de acceso
            </Button>
          </div>
        )}

        {step === "sent" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Te enviamos un link de acceso a{" "}
              <strong className="text-foreground">{email}</strong>. Abrilo
              desde este dispositivo para ingresar.
            </p>
            <Button variant="ghost" onClick={() => setStep("start")}>
              Volver
            </Button>
          </div>
        )}

        {step === "completing" && (
          <p className="text-sm text-muted-foreground">Ingresando…</p>
        )}

        {step === "need-email" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Confirmá tu correo para completar el ingreso.
            </p>
            <Label htmlFor="confirm-email">Correo</Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder="tu@correo.com"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={submitting}
            />
            <Button onClick={handleConfirmEmail} disabled={submitting}>
              Ingresar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
