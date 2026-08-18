import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Qué datos recopila Cittadella, para qué se usan y con quién se comparten.",
  alternates: { canonical: "/privacidad" },
};

const ACTUALIZADO = "18 de agosto de 2026";
const EMAIL_CONTACTO = "[tu-email-de-contacto]";

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <Link href="/" className="text-xs text-muted-foreground underline">
        ← Volver al inicio
      </Link>

      <h1 className="mb-1 mt-6 text-2xl font-bold">Política de Privacidad</h1>
      <p className="mb-8 text-xs text-muted-foreground">
        Última actualización: {ACTUALIZADO}
      </p>

      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>
          Cittadella (&quot;la app&quot;, &quot;nosotros&quot;) es la
          responsable del tratamiento de los datos personales que se
          describen en esta política. Si tenés cualquier duda o querés
          ejercer alguno de tus derechos, podés escribirnos a{" "}
          <strong>{EMAIL_CONTACTO}</strong>.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos recopilamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Datos de tu cuenta:</strong> tu email y, si te registrás
            con Google, tu nombre y foto de perfil.
          </li>
          <li>
            <strong>Contenido que cargás:</strong> los libros de tu
            biblioteca, tus préstamos, tus reseñas, tus notas privadas y tu
            objetivo de lectura.
          </li>
          <li>
            <strong>Preferencias:</strong> el idioma de la interfaz, los
            idiomas en que leés y los géneros que te gustan.
          </li>
          <li>
            <strong>Datos de contacto opcionales:</strong> si cargás tu
            WhatsApp o usás tu email para que te contacten desde el catálogo
            público, esos datos quedan visibles para quien vea ese catálogo.
          </li>
          <li>
            <strong>Datos de otros miembros:</strong> si te invitan a una
            biblioteca compartida o invitás a alguien, guardamos el nombre y
            el email de esa persona para gestionar el acceso.
          </li>
          <li>
            <strong>Datos técnicos básicos:</strong> tu país aproximado
            (vía headers de nuestro proveedor de hosting), usado solo para
            sugerirte un idioma por defecto la primera vez que entrás.
          </li>
          <li>
            <strong>Almacenamiento local del navegador:</strong> usamos
            `localStorage` para recordar preferencias como la biblioteca
            activa o el tipo de vista del catálogo. No es información que
            salga de tu dispositivo.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Para qué usamos tus datos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Para darte acceso a tu cuenta y a tus bibliotecas.</li>
          <li>
            Para que puedas compartir tu biblioteca con otras personas y
            gestionar préstamos.
          </li>
          <li>
            Para completar automáticamente los datos de un libro cuando
            escaneás o buscás un ISBN.
          </li>
          <li>
            Para que, si activás el catálogo público, otras personas puedan
            consultarlo y contactarte por WhatsApp o email si así lo
            configuraste.
          </li>
          <li>
            Para mandarte el email de invitación cuando alguien te invita a
            su biblioteca.
          </li>
        </ul>
        <p className="mt-2">
          No usamos tus datos para publicidad ni los vendemos a terceros.
        </p>
      </Seccion>

      <Seccion titulo="4. Con quién compartimos datos">
        <p className="mb-2">
          Usamos los siguientes proveedores para hacer funcionar la app.
          Cada uno procesa los datos necesarios para su función, bajo sus
          propias políticas de privacidad:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Google Firebase</strong> (autenticación, base de datos y
            almacenamiento de imágenes de portadas).
          </li>
          <li>
            <strong>Google Books</strong> y <strong>Open Library</strong>:
            les consultamos el ISBN que buscás para completar los datos de
            un libro; no les enviamos tus datos personales.
          </li>
          <li>
            <strong>Resend</strong>: envía los emails de invitación a nuevos
            miembros.
          </li>
          <li>
            <strong>Vercel</strong>: aloja la aplicación.
          </li>
        </ul>
        <p className="mt-2">
          Además, los miembros de una biblioteca compartida ven el nombre,
          email y (si lo cargaste) el WhatsApp de los demás miembros. Si
          activás el catálogo público, cualquier persona con el link puede
          ver el catálogo de esa biblioteca y, si configuraste WhatsApp o
          email de contacto, usarlos para escribirte.
        </p>
      </Seccion>

      <Seccion titulo="5. Cuánto tiempo conservamos tus datos">
        <p>
          Conservamos tus datos mientras tu cuenta exista. Si eliminás tu
          cuenta o nos pedís que borremos tus datos, los eliminamos salvo
          que necesitemos conservar alguna información por una obligación
          legal.
        </p>
      </Seccion>

      <Seccion titulo="6. Tus derechos">
        <p>
          Podés pedirnos en cualquier momento acceder, corregir o eliminar
          tus datos personales, o que te informemos qué datos tuyos
          tenemos guardados. Para eso, escribinos a{" "}
          <strong>{EMAIL_CONTACTO}</strong>.
        </p>
      </Seccion>

      <Seccion titulo="7. Seguridad">
        <p>
          El acceso a los datos de cada biblioteca está limitado a sus
          miembros mediante reglas de acceso de Firebase. Las conexiones a
          la app viajan siempre encriptadas (HTTPS).
        </p>
      </Seccion>

      <Seccion titulo="8. Menores de edad">
        <p>
          Cittadella no está dirigida a menores de 13 años. Si sos padre,
          madre o tutor y creés que un menor a tu cargo nos dio datos
          personales sin tu consentimiento, contactanos para eliminarlos.
        </p>
      </Seccion>

      <Seccion titulo="9. Cambios a esta política">
        <p>
          Si actualizamos esta política, vamos a cambiar la fecha que
          figura al principio de esta página.
        </p>
      </Seccion>

      <Seccion titulo="10. Contacto">
        <p>
          Ante cualquier duda sobre esta política o sobre tus datos,
          escribinos a <strong>{EMAIL_CONTACTO}</strong>.
        </p>
      </Seccion>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="mb-2 text-base font-semibold">{titulo}</h2>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
