import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 5"
      description="Lista de clientes con su historial de turnos."
    />
  );
}
