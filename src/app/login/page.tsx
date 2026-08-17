"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.13 2.73-2.4 3.58v3h3.86c2.26-2.09 3.62-5.17 3.62-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.28A11.94 11.94 0 0 0 0 12c0 1.92.46 3.74 1.28 5.38l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

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
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="size-5 text-primary-foreground" />
          </div>
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
              <GoogleIcon />
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
