import type { Metadata } from "next";
import Link from "next/link";
import { History, RotateCcw, ToggleLeft, Users } from "lucide-react";
import { LandingAuthRedirect } from "@/components/landing/auth-redirect";
import { Reveal } from "@/components/landing/reveal";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  keywords: [
    "organizar biblioteca en casa",
    "catalogar biblioteca personal gratis",
    "app para controlar libros prestados",
    "como saber a quién le presté un libro",
    "compartir biblioteca con la familia",
    "inventario de libros compartido",
    "escaneo isbn libros app",
    "app para buscar libros por código de barras",
    "app para ver qué libros tenemos en casa",
    "donde dejar reseñas de libros leídos",
  ],
};

// Portadas reales (ediciones en español, vía Open Library Covers API).
const COVERS = [
  { t: "Rayuela", a: "Julio Cortázar", portada: "https://covers.openlibrary.org/b/id/1047466-L.jpg" },
  { t: "Ficciones", a: "Jorge Luis Borges", portada: "https://covers.openlibrary.org/b/id/10832290-L.jpg" },
  {
    t: "Los detectives salvajes",
    a: "Roberto Bolaño",
    portada: "https://covers.openlibrary.org/b/id/3706128-L.jpg",
  },
  {
    t: "Cien años de soledad",
    a: "Gabriel García Márquez",
    portada: "https://covers.openlibrary.org/b/id/13215914-L.jpg",
  },
  {
    t: "Pedro Páramo",
    a: "Juan Rulfo",
    portada: "https://covers.openlibrary.org/b/id/4901502-L.jpg",
  },
  {
    t: "El túnel",
    a: "Ernesto Sábato",
    portada: "https://covers.openlibrary.org/b/id/5517733-L.jpg",
  },
  {
    t: "La invención de Morel",
    a: "Adolfo Bioy Casares",
    portada: "https://covers.openlibrary.org/b/id/1046845-L.jpg",
  },
  {
    t: "Cuentos completos",
    a: "Silvina Ocampo",
    portada: "https://covers.openlibrary.org/b/id/3711230-L.jpg",
  },
  {
    t: "Aura",
    a: "Carlos Fuentes",
    portada: "https://covers.openlibrary.org/b/id/5314209-L.jpg",
  },
  {
    t: "Bestiario",
    a: "Julio Cortázar",
    portada: "https://covers.openlibrary.org/b/id/5721778-L.jpg",
  },
];

function BookCover({ cover }: { cover: (typeof COVERS)[number] }) {
  return (
    <div className={styles.bookCover}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.portada}
        alt={`${cover.t} — ${cover.a}`}
        className={styles.bookCoverImg}
        loading="eager"
      />
    </div>
  );
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cittadella",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  description:
    "Catalogá tus libros escaneando el ISBN, controlá a quién le prestaste cada uno y compartí tu biblioteca con tu familia en tiempo real.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <LandingAuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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

      <header className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Tu biblioteca en casa</span>
            <h1>
              Cada libro que tenés, cada libro que <em>prestás</em>, en un
              solo lugar.
            </h1>
            <p className={styles.lede}>
              Convierte tu estantería en una biblioteca de verdad:
              catalogada, prestable y compartida con quien vos elijas.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
                Crear mi biblioteca — gratis
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.carouselWrap}>
          <div className={styles.carouselTrack}>
            {COVERS.map((cover, i) => (
              <BookCover key={`a-${i}`} cover={cover} />
            ))}
            {COVERS.map((cover, i) => (
              <BookCover key={`b-${i}`} cover={cover} />
            ))}
          </div>
        </div>
      </header>

      <section id="catalogo">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Catálogo</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.sectionHead}>
            <h2>Escaneá un código. ¡Listo! Ya está en tu biblioteca.</h2>
            <p className={styles.support}>
              Cittadella busca el libro en Google Books —con respaldo en
              Open Library— y completa título, autor, editorial y portada
              por vos. Así se cataloga una biblioteca personal gratis,
              sin tipear nada: cargá uno o encadená diez seguidos.
            </p>
          </div>
          <Reveal className={styles.featureGrid}>
            <div className={styles.feature}>
              <span className={styles.num}>01</span>
              <h3>Escaneo por ISBN y autocompletado</h3>
              <p>
                Cámara del celular, código de barras, y el libro aparece
                completo. Si ya tenés una copia, te avisa antes de
                duplicarla.
              </p>
            </div>
            <div className={styles.feature}>
              <span className={styles.num}>02</span>
              <h3>Estantes y favoritos</h3>
              <p>
                Organizá por estante propio, marcá disponibilidad y
                favoritos, y buscá por título, autor o género sin pelearte
                con acentos ni mayúsculas.
              </p>
            </div>
            <div className={styles.feature}>
              <span className={styles.num}>03</span>
              <h3>Reseñas con cara, no con estrellas</h3>
              <p>
                Cada libro tiene su rating comunitario y un lugar donde
                dejar reseñas de los libros que leíste —con &quot;caras&quot;
                de color en vez de estrellitas genéricas.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="prestamos">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Préstamos</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.sectionHead}>
            <h2>Prestar un libro no debería ser un acto de fe.</h2>
            <p className={styles.support}>
              Elegís el libro, elegís a quién —un socio registrado o
              alguien nuevo— y anotás la fecha. Con Cittadella nunca más
              te preguntás a quién le prestaste un libro: el historial
              completo de cada persona queda a un clic.
            </p>
          </div>
          <Reveal>
            <ul className={styles.checklist}>
              <li>
                <div className={styles.iconBadge}>
                  <RotateCcw size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <strong>Un botón para devolver</strong>
                  <span>
                    Marcás &quot;devuelto&quot; y el libro vuelve a estar
                    disponible al instante para toda la biblioteca.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.iconBadge}>
                  <Users size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <strong>Socios con historial</strong>
                  <span>
                    Nombre, teléfono, email y notas de cada persona, con
                    todos sus préstamos pasados y presentes.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.iconBadge}>
                  <ToggleLeft size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <strong>Modo socios opcional</strong>
                  <span>
                    Si tu biblioteca es informal, prestá con texto libre.
                    Si es un club o una institución, activá socios
                    registrados.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.iconBadge}>
                  <History size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <strong>Historial que no se pierde</strong>
                  <span>
                    Cada préstamo y cada devolución queda registrado, para
                    siempre, aunque cambien los libros de estante.
                  </span>
                </div>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section id="publico">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Catálogo público</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.split}>
            <div>
              <h2 style={{ marginBottom: 20 }}>
                Compartí tu biblioteca con tu familia sin pedirle a nadie
                que se registre.
              </h2>
              <p
                style={{
                  color: "var(--paper-dim)",
                  fontSize: 16,
                  maxWidth: 440,
                  marginBottom: 20,
                }}
              >
                Activás un link, y cualquiera puede ver qué libros tenés
                en casa en modo solo lectura —hasta ocho columnas en
                desktop, filtros incluidos. Cuando alguien quiere un
                libro, te escribe directo.
              </p>
              <p style={{ color: "var(--paper-dim)", fontSize: 16, maxWidth: 440 }}>
                Vos —la persona dueña de la biblioteca— sos quien recibe
                cada pedido. Sin intermediarios, sin cuentas nuevas.
              </p>
            </div>
            <Reveal className={styles.visual}>
              <div className={styles.catalogCard}>
                <div className={styles.cover} style={{ background: "var(--spine-red)" }} />
                <div className={styles.meta}>
                  <h4>Rayuela</h4>
                  <span>Julio Cortázar · Disponible</span>
                </div>
              </div>
              <div className={styles.catalogCard}>
                <div className={styles.cover} style={{ background: "var(--spine-green)" }} />
                <div className={styles.meta}>
                  <h4>Ficciones</h4>
                  <span>Jorge Luis Borges · Prestado</span>
                </div>
              </div>
              <div className={styles.catalogCard}>
                <div className={styles.cover} style={{ background: "var(--gold-dim)" }} />
                <div className={styles.meta}>
                  <h4>Los detectives salvajes</h4>
                  <span>Roberto Bolaño · Disponible</span>
                </div>
              </div>
              <span className={styles.waBtn}>↳ Pedir por WhatsApp</span>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="comunidad">
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Descubrimiento</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.sectionHead}>
            <h2>Tu biblioteca sabe lo que leíste. Y también lo que todavía no.</h2>
            <p className={styles.support}>
              El inicio muestra cuánto leíste, cuánto prestaste, y tu
              objetivo del año en progreso. Cada semana, además, te
              sugiere hasta siete libros que otras bibliotecas de la
              comunidad tienen y la tuya no —solo para descubrir, no para
              envidiar.
            </p>
          </div>
          <Reveal className={styles.dash}>
            <div className={styles.dashRow}>
              <div className={styles.dashStat}>
                <div className={styles.n}>214</div>
                <div className={styles.l}>libros en tu biblioteca</div>
              </div>
              <div className={styles.dashStat}>
                <div className={styles.n}>12</div>
                <div className={styles.l}>prestados hoy</div>
              </div>
              <div className={styles.dashStat}>
                <div className={styles.n}>38</div>
                <div className={styles.l}>leídos este año</div>
              </div>
              <div className={styles.dashStat}>
                <div className={styles.n}>64%</div>
                <div className={styles.l}>objetivo de lectura</div>
                <div className={styles.progress}>
                  <i></i>
                </div>
              </div>
            </div>
            <span className={styles.eyebrow} style={{ display: "block", marginBottom: 14 }}>
              Selección de la semana
            </span>
            <div className={styles.weekPick}>
              {["var(--spine-red)", "var(--gold-dim)", "var(--spine-green)", "var(--spine-blue)", "#3d3d3b", "var(--gold)", "#232322"].map(
                (bg, i) => (
                  <div key={i} className={styles.p} style={{ background: bg }} />
                )
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className={styles.wrap}>
          <div className={styles.divider}>
            <span className={styles.tag}>Espacio compartido</span>
            <span className={styles.rule}></span>
          </div>
          <div className={styles.sectionHead}>
            <h2>
              Una biblioteca es de todos los que la usan, no de quien
              apretó &quot;crear&quot;.
            </h2>
            <p className={styles.support}>
              Invitá por email a quien quieras: el lugar te espera hasta
              que se loguee. Cualquier miembro puede editar el inventario
              completo. Solo quien creó la biblioteca —la persona
              dueña— no puede ser removida, y es quien recibe los pedidos
              del catálogo público.
            </p>
          </div>
          <Reveal>
            <ul className={styles.checklist}>
              <li>
                <div className={styles.dot}></div>
                <div>
                  <strong>Sin jerarquías de admin</strong>
                  <span>
                    El permiso es de membresía, no de rol. Todos editan,
                    todos cuidan la biblioteca por igual.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.dot}></div>
                <div>
                  <strong>Varias bibliotecas a la vez</strong>
                  <span>
                    La tuya, la del club de lectura, la de tu familia: un
                    selector en el menú de cuenta y listo.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.dot}></div>
                <div>
                  <strong>Cambios en tiempo real</strong>
                  <span>
                    Lo que edita una persona lo ve toda la biblioteca al
                    instante, en cualquier pantalla que tenga abierta.
                  </span>
                </div>
              </li>
              <li>
                <div className={styles.dot}></div>
                <div>
                  <strong>Idioma propio, catálogo global</strong>
                  <span>
                    Interfaz en español, inglés, portugués o italiano; y
                    tus idiomas de lectura priorizan cada búsqueda de
                    libros.
                  </span>
                </div>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className={styles.principle} style={{ borderTop: "none" }}>
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>Principio</span>
          <p>Cittadella no reemplaza tu estantería. Le pone memoria.</p>
        </div>
      </section>

      <footer>
        <div className={styles.wrap}>
          <Reveal className={styles.ctaFinal}>
            <span className={styles.eyebrow} style={{ display: "block", marginBottom: 20 }}>
              Empezar
            </span>
            <h2>
              Tu primera estantería tarda cinco minutos en convertirse en
              biblioteca.
            </h2>
            <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
              Crear mi biblioteca — gratis
            </Link>
          </Reveal>
          <div className={styles.footBottom}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Cittadella" className={styles.logoImgInvertido} />
            <div className={styles.footLinks}>
              <a href="#catalogo">Catálogo</a>
              <a href="#prestamos">Préstamos</a>
              <a href="#publico">Catálogo público</a>
              <a href="#comunidad">Comunidad</a>
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
