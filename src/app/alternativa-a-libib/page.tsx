import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import styles from "../landing.module.css";

export const metadata: Metadata = {
  title: "Alternativa a Libib gratis y en español",
  description:
    "¿Buscás algo como Libib pero más simple? Cittadella cataloga tu biblioteca por ISBN, gestiona préstamos y tiene catálogo público, todo gratis y en español, sin curva de aprendizaje.",
  keywords: [
    "alternativa a Libib",
    "Libib en español",
    "Libib gratis",
    "app como Libib",
    "Libib vs Cittadella",
    "catalogar biblioteca personal como Libib",
    "software para bibliotecas personales",
  ],
  alternates: { canonical: "/alternativa-a-libib" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Cittadella",
    title: "Alternativa a Libib, gratis y en español",
    description:
      "Catalogá por ISBN, prestá libros y compartí tu catálogo sin pagar un plan Pro ni pelearte con un menú complicado.",
    images: [{ url: "/logo.png", width: 688, height: 190, alt: "Cittadella" }],
  },
};

const FAQ = [
  {
    p: "¿Libib tiene versión gratuita?",
    r: "Sí, pero limitada al catálogo: para gestionar préstamos, tener un catálogo público interactivo o agregar campos personalizados hay que pagar el plan Libib Pro.",
  },
  {
    p: "¿Hay algo como Libib pero gratis y en español?",
    r: "Sí, Cittadella. Cataloga por ISBN, gestiona préstamos con historial y tiene catálogo público compartible, todo sin plan pago, con la interfaz 100% en español.",
  },
  {
    p: "¿Cittadella tiene algún costo?",
    r: "No. Hoy Cittadella es gratis, sin límites de libros ni funciones bloqueadas detrás de un plan superior.",
  },
  {
    p: "¿Por qué elegir Cittadella en vez de Libib si las funciones son parecidas?",
    r: "Porque resuelven lo mismo con muchos menos pasos: sin colecciones que configurar, sin campos que armar a mano y sin plan Pro que activar para prestar un libro. Escaneás el ISBN y ya está.",
  },
];

export default function AlternativaLibibPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.p,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  };

  return (
    <div className={styles.landing}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav>
        <div className={styles.wrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Cittadella" className={styles.logoImg} />
          <Link href="/login" className={styles.navCta}>
            Crear mi biblioteca
          </Link>
        </div>
      </nav>

      <header className={styles.hero} style={{ paddingBottom: 40 }}>
        <div className={styles.wrap}>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Alternativa a Libib</span>
            <h1>
              Lo mismo que hace <em>Libib</em>, sin el manual de instrucciones.
            </h1>
            <p className={styles.lede}>
              Catalogar, prestar y compartir tu biblioteca no debería requerir
              armar colecciones, campos personalizados ni activar un plan Pro.
              Cittadella hace las mismas cosas con muchos menos clics —y es
              gratis, en español, desde el primer libro.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
                Crear mi biblioteca — gratis
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section id="comparativa">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Comparativa</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.sectionHead}>
            <h2>Cittadella vs. Libib</h2>
            <p className={styles.support}>
              En funciones, Libib hace cosas parecidas a Cittadella —a veces
              más, si contás juegos de mesa, películas o música. La diferencia
              está en cuánto tenés que configurar antes de usarlo, y en qué
              está detrás de un plan pago.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Función</th>
                  <th>Cittadella</th>
                  <th>Libib (gratis)</th>
                  <th>Libib Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.destacada}>
                  <td>Catalogar por ISBN</td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                </tr>
                <tr>
                  <td>Prestar y devolver con historial</td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                  <td>
                    <Minus className={styles.no} size={16} />
                  </td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                </tr>
                <tr className={styles.destacada}>
                  <td>Catálogo público compartible por link</td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                  <td>
                    <Minus className={styles.no} size={16} />
                  </td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                </tr>
                <tr>
                  <td>Reseñas y rating de la comunidad</td>
                  <td>
                    <Check className={styles.si} size={16} />
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
                <tr className={styles.destacada}>
                  <td>Configuración necesaria para empezar</td>
                  <td>Ninguna: escaneás y listo</td>
                  <td colSpan={2}>Colecciones, campos y usuarios a armar</td>
                </tr>
                <tr>
                  <td>Tipo de contenido</td>
                  <td>Libros</td>
                  <td colSpan={2}>Libros, juegos, películas, música, videojuegos</td>
                </tr>
                <tr className={styles.destacada}>
                  <td>Precio</td>
                  <td>Gratis</td>
                  <td>Gratis (catálogo simple)</td>
                  <td>De pago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="por-que">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Por qué cambiarte</span>
            <span className={styles.rule}></span>
          </div>
          <Reveal className={styles.featureGrid}>
            <div className={styles.feature}>
              <span className={styles.num}>01</span>
              <h3>Cero configuración previa</h3>
              <p>
                No armás colecciones ni campos personalizados: escaneás el
                ISBN y el libro ya tiene título, autor, portada y editorial
                cargados.
              </p>
            </div>
            <div className={styles.feature}>
              <span className={styles.num}>02</span>
              <h3>Préstamos sin plan Pro</h3>
              <p>
                Registrar a quién le prestaste un libro y ver el historial es
                parte del uso normal, no una función que hay que pagar para
                desbloquear.
              </p>
            </div>
            <div className={styles.feature}>
              <span className={styles.num}>03</span>
              <h3>Todo en español, de entrada</h3>
              <p>
                Interfaz pensada en español desde el diseño, no traducida
                después. Y disponible también en inglés, portugués e
                italiano.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="faq">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Preguntas frecuentes</span>
            <span className={styles.rule}></span>
          </div>
          <div>
            {FAQ.map((f) => (
              <div key={f.p} className={styles.faqItem}>
                <h3>{f.p}</h3>
                <p>{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className={styles.wrap}>
          <Reveal className={styles.ctaFinal}>
            <span className={styles.eyebrow} style={{ display: "block", marginBottom: 20 }}>
              Empezar
            </span>
            <h2>Probá Cittadella gratis y compará vos mismo.</h2>
            <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
              Crear mi biblioteca — gratis
            </Link>
          </Reveal>
          <div className={styles.footBottom}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Cittadella" className={styles.logoImgInvertido} />
            <div className={styles.footLinks}>
              <Link href="/">Inicio</Link>
              <Link href="/privacidad">Privacidad</Link>
            </div>
            <span>
              Hecho para gente que presta libros y quiere que se los
              devuelvan.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
