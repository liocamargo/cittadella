import { cn } from "@/lib/utils";

/** Spinner de carga: un libro con una página dándose vuelta. */
export function BookSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative h-8 w-11", className)}
      style={{ perspective: "80px" }}
      role="status"
      aria-label="Cargando"
    >
      <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-sm bg-muted-foreground/40" />
      <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-sm bg-muted-foreground/40" />
      <div
        className="animate-book-spinner-flip absolute inset-y-0 left-1/2 w-1/2 origin-left rounded-r-sm border border-muted-foreground/40 bg-background"
        style={{ transformStyle: "preserve-3d" }}
      />
    </div>
  );
}
