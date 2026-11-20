import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Profesionales" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 1"
      description="Profesionales del negocio. En el MVP solo el dueño; preparado para sumar más."
    />
  );
}
