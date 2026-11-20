import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Horarios" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 2"
      description="Días y horarios laborales, pausas, vacaciones, bloqueos y excepciones."
    />
  );
}
