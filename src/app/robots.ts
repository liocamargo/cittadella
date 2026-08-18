import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/compartido/"],
        disallow: [
          "/api/",
          "/inicio",
          "/catalogo",
          "/leidos",
          "/prestamos",
          "/socios",
          "/espacio",
          "/importar",
          "/cuenta",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
