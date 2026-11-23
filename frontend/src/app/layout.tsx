import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { THEME_COLORS, THEME_SCRIPT } from "@/components/theme/theme-script";
import "./globals.css";

// Interfaz y títulos: geométrica, con carácter pero muy legible en el celular.
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

// Horas y montos: monoespaciada para que los números queden alineados.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Gestión de turnos para cualquier negocio que trabaje con citas.",
  // iPhone: "Agregar a inicio" la abre a pantalla completa (ícono: app/apple-icon.png).
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black" },
};

export const viewport: Viewport = {
  // Barra del navegador según el tema del sistema (el script del <head> la ajusta si se eligió otro).
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
  ],
  colorScheme: "light dark",
  // Usa toda la pantalla del iPhone; cada barra fija respeta env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script del <head> agrega .dark/.light antes de React.
    <html lang="es" className={`${grotesk.variable} ${jetbrains.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Tema (claro / oscuro / automático) aplicado antes de dibujar: sin parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
