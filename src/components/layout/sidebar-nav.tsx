"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logError } from "@/lib/log";
import {
  Home,
  Library,
  Heart,
  ArrowLeftRight,
  BookCheck,
  Users,
  IdCard,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  ChevronDown,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBiblioteca } from "@/hooks/use-biblioteca";
import { useLocale } from "@/hooks/use-locale";
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

const NAV_ITEMS_BASE = [
  { href: "/inicio", i18nKey: "nav.inicio", icon: Home },
  { href: "/catalogo", i18nKey: "nav.catalogo", icon: Library },
  { href: "/deseos", i18nKey: "nav.deseos", icon: Heart },
  { href: "/leidos", i18nKey: "nav.leidos", icon: BookCheck },
  { href: "/prestamos", i18nKey: "nav.prestamos", icon: ArrowLeftRight },
  { href: "/espacio", i18nKey: "nav.espacio", icon: Users },
] as const;

const SOCIOS_ITEM = { href: "/socios", i18nKey: "nav.socios", icon: IdCard } as const;

// En mobile, la tab bar de abajo solo tiene lugar para lo más usado; el
// resto (Deseos, Espacio, Socios) vive en el menú de arriba.
const HREFS_MENU_MOBILE = new Set(["/deseos", "/espacio", "/socios"]);

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { t } = useLocale();
  const { bibliotecas, bibliotecaActual, seleccionarBiblioteca, crearYSeleccionar } =
    useBiblioteca();
  const [collapsed, setCollapsed] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [creating, setCreating] = useState(false);

  const navItems = bibliotecaActual?.modoSocios
    ? [...NAV_ITEMS_BASE.slice(0, 5), SOCIOS_ITEM, ...NAV_ITEMS_BASE.slice(5)]
    : NAV_ITEMS_BASE;
  const mobileTabItems = navItems.filter((item) => !HREFS_MENU_MOBILE.has(item.href));
  const mobileMenuItems = navItems.filter((item) => HREFS_MENU_MOBILE.has(item.href));

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
      toast.success(t("nav.bibliotecaCreada"));
    } catch (err) {
      logError("Error creando biblioteca:", err);
      toast.error(t("nav.errorCreandoBiblioteca"));
    } finally {
      setCreating(false);
    }
  }

  const bibliotecasListContent = (
    <>
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
          placeholder={t("nav.nuevaBiblioteca")}
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
          {t("common.crear")}
        </Button>
      </div>
    </>
  );

  const cuentaMenuContent = (
    <>
      <div className="truncate px-1.5 py-1 text-xs text-muted-foreground">
        {user?.email}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/cuenta" className="flex items-center gap-2">
          {t("nav.miCuenta")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
        {t("nav.cerrarSesion")}
      </DropdownMenuItem>
    </>
  );

  const accountMenuContent = (
    <DropdownMenuContent align="start" className="w-64">
      <div className="truncate px-1.5 py-1 text-xs text-muted-foreground">
        {user?.email}
      </div>
      <DropdownMenuSeparator />
      {bibliotecasListContent}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/cuenta" className="flex items-center gap-2">
          {t("nav.miCuenta")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
        {t("nav.cerrarSesion")}
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
                {t("nav.espacioCompartido")}
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
          {navItems.map(({ href, i18nKey, icon: Icon }) => {
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
                {!collapsed && <span className="whitespace-nowrap">{t(i18nKey)}</span>}
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
                      {bibliotecaActual?.nombre ?? t("common.cargando")}
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

      {/* Mobile: header fijo arriba — menú | logo | biblioteca | cuenta */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-1.5 border-b bg-background px-3 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
              <Menu className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56 p-2">
            {mobileMenuItems.map(({ href, i18nKey, icon: Icon }, i) => (
              <DropdownMenuItem
                key={href}
                asChild
                className={cn("px-3 py-2.5", i > 0 && "mt-1")}
              >
                <Link href={href} className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {t(i18nKey)}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Cittadella" className="h-6 w-auto shrink-0" />

        {/* Biblioteca seleccionada, separada de la cuenta: cambiar o crear una nueva. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent">
              <span className="truncate">
                {bibliotecaActual?.nombre ?? t("common.cargando")}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            {bibliotecasListContent}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mi cuenta, separada de la biblioteca. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 shrink-0 items-center justify-center rounded-full">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-[12px] font-semibold text-primary-foreground">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {cuentaMenuContent}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile: tab bar fija abajo */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {mobileTabItems.map(({ href, i18nKey, icon: Icon }) => {
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
              <span className="leading-none">{t(i18nKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
