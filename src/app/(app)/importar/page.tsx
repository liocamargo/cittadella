import { redirect } from "next/navigation";

// Importar/Exportar se fusionó con Espacio (misma pantalla de administración
// del espacio compartido). Se mantiene esta ruta solo para no romper links
// viejos guardados por los usuarios.
export default function ImportarPage() {
  redirect("/espacio");
}
