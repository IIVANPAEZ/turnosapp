import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentBusiness, getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configurá tu negocio" };

export default function OnboardingPage() {
  return (
    <main className="glow-ambar flex min-h-screen flex-col items-center gap-8 px-4 py-8 sm:py-12">
      <div className="flex w-full max-w-xl items-center justify-between gap-4">
        <Brand />
        <Steps />
      </div>
      <div className="w-full max-w-xl rounded-2xl border bg-card/80 p-6 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-sm sm:p-8">
        {/* Lee la sesión: con cacheComponents tiene que ir dentro de Suspense. */}
        <Suspense fallback={<OnboardingSkeleton />}>
          <OnboardingContent />
        </Suspense>
      </div>
    </main>
  );
}

/** Indicador "Cuenta ✓ → Tu negocio". */
function Steps() {
  return (
    <ol className="hidden items-center gap-2 text-xs sm:flex" aria-label="Pasos">
      <li className="flex items-center gap-1.5 text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Check className="size-3" strokeWidth={3} />
        </span>
        Cuenta
      </li>
      <li className="h-px w-6 bg-line-strong" aria-hidden="true" />
      <li className="flex items-center gap-1.5 font-medium" aria-current="step">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] text-primary-foreground">
          2
        </span>
        Tu negocio
      </li>
    </ol>
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
          <button type="submit" className="font-medium text-foreground hover:text-primary">
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
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true">
      <div className="h-7 w-2/3 rounded bg-raised" />
      <div className="h-4 w-full rounded bg-raised/60" />
      <div className="mt-4 h-10 rounded-lg bg-inset" />
      <div className="h-20 rounded-lg bg-inset" />
      <div className="h-10 rounded-lg bg-inset" />
      <div className="h-10 rounded-lg bg-raised" />
    </div>
  );
}
