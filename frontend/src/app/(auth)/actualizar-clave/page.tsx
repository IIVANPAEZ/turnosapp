import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Se llega desde el link del email de recuperación (ya con sesión iniciada). */
export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Creá una contraseña nueva" description="La vas a usar para ingresar de ahora en más.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
