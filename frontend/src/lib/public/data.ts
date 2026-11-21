import "server-only";

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { BusinessCategory } from "@/lib/business/schemas";
import type { PriceType } from "@/lib/services/schemas";

export type PublicBusiness = {
  name: string;
  slug: string;
  category: BusinessCategory;
  description: string | null;
  city: string | null;
  address: string | null;
  whatsapp: string | null;
  timezone: string;
  bookingEnabled: boolean;
  maxDays: number;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  priceType: PriceType;
};

/** Datos públicos del negocio (o null si el link no existe). */
export const getPublicBusiness = cache(async (slug: string): Promise<PublicBusiness | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("public_business", { p_slug: slug });
  if (error) {
    console.error("[público] public_business:", error.code, error.message);
    return null;
  }
  const b = data?.[0];
  if (!b) return null;
  return {
    name: b.name,
    slug: b.slug,
    category: b.category,
    description: b.description,
    city: b.city,
    address: b.address,
    whatsapp: b.whatsapp,
    timezone: b.timezone,
    bookingEnabled: b.booking_enabled,
    maxDays: b.booking_max_days,
  };
});

/** Servicios activos del negocio. */
export const getPublicServices = cache(async (slug: string): Promise<PublicService[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("public_services", { p_slug: slug });
  if (error) {
    console.error("[público] public_services:", error.code, error.message);
    return [];
  }
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.duration_minutes,
    price: s.price,
    priceType: s.price_type,
  }));
});
