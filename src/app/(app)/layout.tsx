"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BibliotecaProvider } from "@/hooks/use-biblioteca";
import { SidebarNav } from "@/components/layout/sidebar-nav";

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

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BibliotecaProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SidebarNav />
        <main className="h-screen flex-1 overflow-y-auto p-5 pb-24 md:p-12">
          {children}
        </main>
      </div>
    </BibliotecaProvider>
  );
}
