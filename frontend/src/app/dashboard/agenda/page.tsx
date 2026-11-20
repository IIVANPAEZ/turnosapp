import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Agenda" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 3"
      description="Vista diaria y semanal, creación manual de turnos, confirmación, reprogramación y cancelación."
    />
  );
}
