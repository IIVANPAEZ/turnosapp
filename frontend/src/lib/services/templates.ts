import type { BusinessCategory } from "@/lib/business/schemas";
import type { PriceType } from "./schemas";

export type ServiceTemplate = {
  /** Identificador estable para la selección en pantalla. */
  key: string;
  name: string;
  durationMinutes: number;
  /** Precio de ejemplo en guaraníes: el usuario lo ajusta. */
  price: number;
  priceType: PriceType;
};

/** Servicios sugeridos para arrancar, según el rubro del negocio. */
export const SERVICE_TEMPLATES: Record<BusinessCategory, ServiceTemplate[]> = {
  beauty: [
    { key: "corte", name: "Corte de cabello", durationMinutes: 45, price: 60_000, priceType: "from" },
    { key: "barba", name: "Barba", durationMinutes: 30, price: 40_000, priceType: "fixed" },
    { key: "corte-barba", name: "Corte + barba", durationMinutes: 60, price: 90_000, priceType: "fixed" },
    { key: "manicura", name: "Manicura", durationMinutes: 45, price: 50_000, priceType: "fixed" },
    { key: "kapping", name: "Kapping gel", durationMinutes: 60, price: 80_000, priceType: "fixed" },
    { key: "pestanas", name: "Lifting de pestañas", durationMinutes: 60, price: 120_000, priceType: "fixed" },
    { key: "color", name: "Coloración", durationMinutes: 120, price: 150_000, priceType: "from" },
  ],
  health: [
    { key: "consulta", name: "Consulta", durationMinutes: 30, price: 150_000, priceType: "fixed" },
    { key: "control", name: "Control", durationMinutes: 20, price: 100_000, priceType: "fixed" },
    { key: "limpieza", name: "Limpieza dental", durationMinutes: 45, price: 200_000, priceType: "fixed" },
    { key: "kinesio", name: "Sesión de kinesiología", durationMinutes: 45, price: 120_000, priceType: "fixed" },
    { key: "nutricion", name: "Consulta nutricional", durationMinutes: 45, price: 150_000, priceType: "fixed" },
  ],
  other: [
    { key: "consulta", name: "Consulta", durationMinutes: 30, price: 100_000, priceType: "fixed" },
    { key: "sesion", name: "Sesión", durationMinutes: 60, price: 150_000, priceType: "from" },
  ],
};
