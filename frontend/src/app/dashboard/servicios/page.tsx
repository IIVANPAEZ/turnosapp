import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Servicios" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Sprint 2"
      description="Servicios con precio en guaraníes, duración y tiempo de preparación."
    />
  );
}
