import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "WhatsApp" };

export default function Page() {
  return (
    <PagePlaceholder
      sprint="Post-MVP"
      description="Cada profesional conecta su propio número escaneando un QR para enviar recordatorios."
    />
  );
}
