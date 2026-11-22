import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

/**
 * Manifiesto de la app instalable (PWA).
 *
 * No usamos app/manifest.ts a propósito: ese archivo se enlaza en TODAS las
 * páginas, y Chrome les ofrecería "Instalar" a los clientes en la página
 * pública de reservas (y esa app abriría el panel). Este se enlaza solo en el
 * panel y en las pantallas de acceso (metadata.manifest en sus layouts).
 */
const manifest: MetadataRoute.Manifest = {
  id: "/dashboard",
  name: APP_NAME,
  short_name: APP_NAME,
  description: "Tu agenda de turnos, clientes y cobros.",
  lang: "es",
  start_url: "/dashboard",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#121417",
  theme_color: "#121417",
  categories: ["business", "productivity"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  shortcuts: [
    { name: "Agenda", url: "/dashboard/agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    { name: "Clientes", url: "/dashboard/clientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
