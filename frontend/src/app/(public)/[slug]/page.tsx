import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarOff, MapPin, MessageCircle } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { BUSINESS_CATEGORIES } from "@/lib/business/schemas";
import { getPublicBusiness, getPublicServices, type PublicBusiness } from "@/lib/public/data";
import { todayYMD } from "@/lib/time/zone";
import { whatsAppLink } from "@/lib/whatsapp";
import { BookingFlow } from "./booking-flow";

/** Título y descripción para cuando se comparte el link (WhatsApp, Instagram, Google). */
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) return { title: "Página no encontrada" };
  const where = [business.city].filter(Boolean).join(", ");
  const description =
    business.description ?? `Reservá tu turno en ${business.name}${where ? ` (${where})` : ""}, en pocos segundos.`;
  return {
    title: { absolute: `${business.name} · Reservá tu turno` },
    description,
    openGraph: { title: `${business.name} · Reservá tu turno`, description, type: "website" },
  };
}

export default function PublicBookingPage({ params }: PageProps<"/[slug]">) {
  return (
    <main className="glow-ambar min-h-screen">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-36 sm:pt-12">
        {/* params y datos del negocio se resuelven al visitar: van dentro de Suspense. */}
        <Suspense fallback={<PublicSkeleton />}>
          <PublicContent params={params} />
        </Suspense>
        <footer className="pt-4 text-center text-xs text-faint">
          Reservas con <span className="font-medium text-muted-foreground">{APP_NAME}</span>
        </footer>
      </div>
    </main>
  );
}

async function PublicContent({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();

  const services = business.bookingEnabled ? await getPublicServices(slug) : [];
  const contact = whatsAppLink(business.whatsapp, `Hola, quería consultar por un turno en ${business.name}.`);

  return (
    <>
      <BusinessHeader business={business} contact={contact} />

      {!business.bookingEnabled || services.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
          <CalendarOff className="size-6 text-faint" />
          <h2 className="font-medium">
            {business.bookingEnabled ? "Todavía no hay servicios para reservar" : "Las reservas online están pausadas"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {contact ? "Escribinos por WhatsApp y coordinamos tu turno." : "Volvé a intentar más tarde."}
          </p>
        </section>
      ) : (
        <BookingFlow
          business={{
            name: business.name,
            slug: business.slug,
            timezone: business.timezone,
            whatsapp: business.whatsapp,
            place: [business.address, business.city].filter(Boolean).join(" · ") || null,
          }}
          services={services}
          today={todayYMD(business.timezone)}
          maxDays={business.maxDays}
        />
      )}
    </>
  );
}

function BusinessHeader({ business: b, contact }: { business: PublicBusiness; contact: string | null }) {
  const category = BUSINESS_CATEGORIES.find((c) => c.value === b.category);
  const place = [b.address, b.city].filter(Boolean).join(" · ");
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-[0_8px_30px_-10px_rgb(242_169_59/0.7)]">
          {b.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{b.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {category && category.value !== "other" ? category.label : "Reservá tu turno"}
          </p>
        </div>
      </div>
      {b.description && <p className="text-[15px] leading-relaxed text-secondary-foreground">{b.description}</p>}
      {(place || contact) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {place && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4 text-faint" /> {place}
            </span>
          )}
          {contact && (
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success-soft px-3 py-1.5 font-medium text-success transition-colors hover:bg-success/20"
            >
              <MessageCircle className="size-4" /> Consultar por WhatsApp
            </a>
          )}
        </div>
      )}
    </header>
  );
}

function PublicSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-2xl bg-raised" />
        <div className="flex flex-col gap-2">
          <div className="h-7 w-52 rounded bg-raised" />
          <div className="h-4 w-24 rounded bg-raised/60" />
        </div>
      </div>
      <div className="h-4 w-full rounded bg-raised/60" />
      <div className="h-48 rounded-2xl bg-card" />
      <div className="h-32 rounded-2xl bg-card" />
    </div>
  );
}
