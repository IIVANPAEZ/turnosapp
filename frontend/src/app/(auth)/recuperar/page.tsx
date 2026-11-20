import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperá tu contraseña"
      description="Te enviamos un link por email para crear una nueva."
      footer={
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Volver a ingresar
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
