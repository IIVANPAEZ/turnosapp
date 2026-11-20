import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Ingresá a tu cuenta"
      description="Gestioná tus turnos, clientes e ingresos."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-foreground hover:underline">
            Registrate gratis
          </Link>
        </>
      }
    >
      {/* El form lee ?next= y ?error= de la URL: con cacheComponents va dentro de Suspense. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
