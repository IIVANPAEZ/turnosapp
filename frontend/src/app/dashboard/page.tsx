import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Inicio" };

export default function DashboardPage() {
  return (
    <PagePlaceholder
      sprint="Sprint 5"
      description="Turnos del día, próximos turnos, ingresos del día, la semana y el mes, y servicios más solicitados."
    />
  );
}
