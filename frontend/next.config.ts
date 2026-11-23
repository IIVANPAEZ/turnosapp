import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Aviso "Sin conexión" (useOffline) y reintento automático de navegaciones y acciones.
    useOffline: true,
  },
  // Encabezados de seguridad en todas las respuestas.
  // (Sin CSP completa con nonces: obligaría a generar cada página en el momento y
  // perderíamos la carga instantánea; frame-ancestors sí, porque no tiene ese costo.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nadie puede mostrar TurnoPy dentro de otra página (evita engaños tipo "clickjacking").
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // El navegador no "adivina" tipos de archivo.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Al seguir un link a otro sitio, solo se comparte el dominio (no la dirección completa).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // La app no usa cámara, micrófono ni ubicación.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          // Siempre por HTTPS (en localhost el navegador lo ignora).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
