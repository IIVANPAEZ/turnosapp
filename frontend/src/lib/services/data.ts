import "server-only";

import { cache } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { PriceType } from "./schemas";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  priceType: PriceType;
  isActive: boolean;
};

/** Servicios del negocio actual, en el orden en que se muestran. */
export const getServices = cache(async (): Promise<Service[]> => {
  const current = await getCurrentBusiness();
  if (!current) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, price_type, is_active")
    .eq("business_id", current.business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`No se pudieron leer los servicios: ${error.message}`);

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.duration_minutes,
    price: s.price,
    priceType: s.price_type,
    isActive: s.is_active,
  }));
});
