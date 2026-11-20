import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Ingresos" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 5"
      description="Registro de pagos y señas, e ingresos por período."
    />
  );
}
