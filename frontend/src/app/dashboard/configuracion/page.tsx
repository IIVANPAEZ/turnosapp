import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Configuración" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 1"
      description="Nombre comercial, descripción, categoría, teléfono, dirección, logo, URL pública y zona horaria."
    />
  );
}
