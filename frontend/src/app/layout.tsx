import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { OfflineBanner } from "@/components/pwa/offline-banner";
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
  themeColor: "#121417",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`dark ${grotesk.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
