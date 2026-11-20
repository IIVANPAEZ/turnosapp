import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Creá tu cuenta"
      description="En el siguiente paso configurás tu negocio."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Ingresá
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
