import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentBusiness, getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configurá tu negocio" };

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-10">
      <Brand tone="light" />
      <div className="w-full max-w-lg">
        {/* Lee la sesión: con cacheComponents tiene que ir dentro de Suspense. */}
        <Suspense fallback={<OnboardingSkeleton />}>
          <OnboardingContent />
        </Suspense>
      </div>
    </main>
  );
}

async function OnboardingContent() {
  await requireUser();
  if (await getCurrentBusiness()) redirect("/dashboard");

  const profile = await getCurrentProfile();
  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <AuthCard
      title={firstName ? `¡Hola, ${firstName}! Configurá tu negocio` : "Configurá tu negocio"}
      description="Con estos datos armamos tu panel y tu página de reservas. Después podés cambiarlos."
      footer={
        <form action={signOut}>
          ¿Te equivocaste de cuenta?{" "}
          <button type="submit" className="font-medium text-foreground hover:underline">
            Cerrar sesión
          </button>
        </form>
      }
    >
      <OnboardingForm defaultWhatsapp={profile?.phone ?? ""} />
    </AuthCard>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border bg-white p-6" aria-busy="true">
      <div className="h-6 w-2/3 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="mt-2 h-9 rounded bg-slate-100" />
      <div className="h-20 rounded bg-slate-100" />
      <div className="h-9 rounded bg-slate-100" />
      <div className="h-9 rounded bg-slate-200" />
    </div>
  );
}
