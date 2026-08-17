"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Library,
  ArrowLeftRight,
  Users,
  ArrowDownUp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/catalogo", label: "Catálogo", icon: Library },
  { href: "/prestamos", label: "Préstamos", icon: ArrowLeftRight },
  { href: "/espacio", label: "Espacio compartido", icon: Users },
  { href: "/importar", label: "Importar / Exportar", icon: ArrowDownUp },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initial = (user?.displayName ?? user?.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  async function handleLogout() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col gap-4 border-r bg-background p-4 transition-[width]",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="whitespace-nowrap text-[15px] font-bold">
              Cittadella
            </div>
            <div className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
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
                    Biblioteca Casa
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
