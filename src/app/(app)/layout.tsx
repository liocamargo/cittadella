"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BibliotecaProvider, useBiblioteca } from "@/hooks/use-biblioteca";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

function Spinner() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { bibliotecas, loading } = useBiblioteca();

  if (loading) return <Spinner />;

  // Cuenta nueva (o sin ninguna invitación resuelta todavía): el wizard
  // pregunta nombre/idioma/géneros y crea la primera biblioteca al terminar.
  if (bibliotecas.length === 0) return <OnboardingWizard />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <SidebarNav />
      <main className="h-screen flex-1 overflow-y-auto p-5 pb-24 pt-16 md:p-12">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) return <Spinner />;

  return (
    <BibliotecaProvider>
      <AppShell>{children}</AppShell>
    </BibliotecaProvider>
  );
}
