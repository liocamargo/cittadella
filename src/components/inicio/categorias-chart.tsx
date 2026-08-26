"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import type { LibroEnBiblioteca, LibroGlobal } from "@/types";

/** Escala de negro a gris (la categoría más grande, más oscura); "Otros" usa el mismo gris neutro. */
const COLORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];
const COLOR_OTROS = "var(--muted-foreground)";
const OTROS_KEY = "__otros__";

interface Slice {
  key: string;
  genero: string | null;
  cantidad: number;
  pct: number;
  color: string;
}

interface CategoriasChartProps {
  copias: LibroEnBiblioteca[];
  globales: Record<string, LibroGlobal>;
}

const SIZE = 220;
const THICKNESS = 32;
const R = (SIZE - THICKNESS) / 2;
const CIRC = 2 * Math.PI * R;

export function CategoriasChart({ copias, globales }: CategoriasChartProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [activo, setActivo] = useState<string | null>(null);

  const slices = useMemo<Slice[]>(() => {
    const conteo = new Map<string, number>();
    for (const c of copias) {
      const genero = globales[c.isbn]?.genero?.trim();
      if (!genero) continue;
      conteo.set(genero, (conteo.get(genero) ?? 0) + 1);
    }
    const total = Array.from(conteo.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const ordenados = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]);
    const principales = ordenados.slice(0, COLORES.length);
    const resto = ordenados.slice(COLORES.length);
    const cantidadOtros = resto.reduce((suma, [, n]) => suma + n, 0);

    const resultado: Slice[] = principales.map(([genero, cantidad], i) => ({
      key: genero,
      genero,
      cantidad,
      pct: Math.round((cantidad / total) * 1000) / 10,
      color: COLORES[i],
    }));
    if (cantidadOtros > 0) {
      resultado.push({
        key: OTROS_KEY,
        genero: null,
        cantidad: cantidadOtros,
        pct: Math.round((cantidadOtros / total) * 1000) / 10,
        color: COLOR_OTROS,
      });
    }
    return resultado;
  }, [copias, globales]);

  if (slices.length === 0) return null;

  const total = slices.reduce((suma, s) => suma + s.cantidad, 0);
  const destacado = slices.find((s) => s.key === activo) ?? null;

  function irACategoria(genero: string | null) {
    router.push(genero ? `/catalogo?genero=${encodeURIComponent(genero)}` : "/catalogo");
  }

  const gap = slices.length > 1 ? 3 : 0;
  let acumulado = 0;

  return (
    <div className="mt-10 rounded-xl border p-5">
      <h2 className="mb-4 text-lg font-bold">{t("categoriasChart.titulo")}</h2>
      <div className="flex flex-wrap items-center gap-8">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              {slices.map((s) => {
                const largoBruto = (s.pct / 100) * CIRC;
                const largo = Math.max(largoBruto - gap, 0);
                const offset = -acumulado;
                acumulado += largoBruto;
                return (
                  <circle
                    key={s.key}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={THICKNESS}
                    strokeDasharray={`${largo} ${CIRC - largo}`}
                    strokeDashoffset={offset}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: !activo || activo === s.key ? 1 : 0.4 }}
                    onMouseEnter={() => setActivo(s.key)}
                    onMouseLeave={() => setActivo(null)}
                    onClick={() => irACategoria(s.genero)}
                  />
                );
              })}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {destacado ? (
              <>
                <div className="text-xl font-bold">{destacado.pct}%</div>
                <div className="max-w-[92px] truncate text-[11px] text-muted-foreground">
                  {destacado.genero ?? t("categoriasChart.otros")}
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold">{total}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("categoriasChart.librosLabel")}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          {slices.map((s) => (
            <button
              key={s.key}
              onClick={() => irACategoria(s.genero)}
              onMouseEnter={() => setActivo(s.key)}
              onMouseLeave={() => setActivo(null)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                activo === s.key && "bg-accent"
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 truncate">
                {s.genero ?? t("categoriasChart.otros")}
              </span>
              <span className="text-muted-foreground">{s.cantidad}</span>
              <span className="w-11 text-right font-semibold">{s.pct}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
