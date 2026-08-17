"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Library,
  ArrowLeftRight,
  BookCheck,
  Users,
  ArrowDownUp,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Bump esto cuando salgamos de beta.
const VERSION = "Beta";

const NAV_ITEMS = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/catalogo", label: "Catálogo", icon: Library },
  { href: "/leidos", label: "Leídos", icon: BookCheck },
  { href: "/prestamos", label: "Préstamos", icon: ArrowLeftRight },
  { href: "/espacio", label: "Espacio", icon: Users },
  { href: "/importar", label: "Import/Export", icon: ArrowDownUp },
];

// En mobile, la tab bar de abajo solo tiene lugar para lo más usado; el
// resto (Espacio, Importar) vive en el menú de arriba.
const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(
  (item) => item.href !== "/espacio" && item.href !== "/importar"
);
const MOBILE_MENU_ITEMS = NAV_ITEMS.filter(
  (item) => item.href === "/espacio" || item.href === "/importar"
);

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { bibliotecas, bibliotecaActual, seleccionarBiblioteca, crearYSeleccionar } =
    useBiblioteca();
  const [collapsed, setCollapsed] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [creating, setCreating] = useState(false);

  const initial = (user?.displayName ?? user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  async function handleLogout() {
    await signOutUser();
    router.replace("/login");
  }

  async function handleCreateLibrary() {
    if (!newLibraryName.trim()) return;
    setCreating(true);
    try {
      await crearYSeleccionar(newLibraryName.trim());
      setNewLibraryName("");
      toast.success("Biblioteca creada.");
    } catch (err) {
      console.error("Error creando biblioteca:", err);
      toast.error("No pudimos crear la biblioteca.");
    } finally {
      setCreating(false);
    }
  }

  const accountMenuContent = (
    <DropdownMenuContent align="start" className="w-64">
      <div className="truncate px-1.5 py-1 text-xs text-muted-foreground">
        {user?.email}
      </div>
      <DropdownMenuSeparator />
      {bibliotecas.map((b) => (
        <DropdownMenuItem
          key={b.id}
          onClick={() => seleccionarBiblioteca(b.id)}
          className="justify-between"
        >
          <span className="truncate">{b.nombre}</span>
          {b.id === bibliotecaActual?.id && <Check className="size-3.5 shrink-0" />}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <div className="flex gap-1.5 px-1.5 py-1">
        <Input
          value={newLibraryName}
          onChange={(e) => setNewLibraryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateLibrary();
            }
          }}
          placeholder="Nueva biblioteca"
          className="h-8 text-xs"
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs"
          disabled={creating}
          onClick={(e) => {
            e.preventDefault();
            handleCreateLibrary();
          }}
        >
          Crear
        </Button>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
        Cerrar sesión
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <>
      {/* Desktop: sidebar fija a la izquierda */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col gap-4 border-r bg-background p-4 transition-[width] md:flex",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Cittadella" className="h-6 w-auto" />
                <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-semibold uppercase">
                  {VERSION}
                </Badge>
              </div>
              <div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                Espacio compartido
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-md p-1 text-left hover:bg-accent">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="overflow-hidden">
                    <div className="truncate text-[13px] font-semibold">
                      {bibliotecaActual?.nombre ?? "Cargando…"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {user?.email}
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            {accountMenuContent}
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile: header fijo arriba — menú | título | cuenta */}
      <header className="fixed inset-x-0 top-0 z-40 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b bg-background px-3 py-2.5 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 items-center justify-center rounded-md border text-muted-foreground">
              <Menu className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {MOBILE_MENU_ITEMS.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild>
                <Link href={href} className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cittadella" className="h-6 w-auto" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 items-center justify-center rounded-full">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          {accountMenuContent}
        </DropdownMenu>
      </header>

      {/* Mobile: tab bar fija abajo */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_TAB_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground",
                active && "text-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
