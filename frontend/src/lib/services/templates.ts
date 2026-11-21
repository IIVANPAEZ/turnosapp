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
  wellness: [
    { key: "masaje-relajante", name: "Masaje relajante", durationMinutes: 60, price: 150_000, priceType: "fixed" },
    { key: "masaje-descontracturante", name: "Masaje descontracturante", durationMinutes: 60, price: 170_000, priceType: "fixed" },
    { key: "yoga", name: "Clase de yoga", durationMinutes: 60, price: 60_000, priceType: "fixed" },
    { key: "entrenador", name: "Sesión con entrenador personal", durationMinutes: 60, price: 100_000, priceType: "fixed" },
  ],
  education: [
    { key: "particular", name: "Clase particular", durationMinutes: 60, price: 80_000, priceType: "fixed" },
    { key: "idioma", name: "Clase de idioma", durationMinutes: 60, price: 90_000, priceType: "fixed" },
    { key: "musica", name: "Clase de música", durationMinutes: 45, price: 80_000, priceType: "fixed" },
    { key: "apoyo", name: "Apoyo escolar", durationMinutes: 60, price: 70_000, priceType: "fixed" },
  ],
  professional: [
    { key: "consulta", name: "Consulta", durationMinutes: 60, price: 200_000, priceType: "from" },
    { key: "asesoria", name: "Asesoría", durationMinutes: 30, price: 150_000, priceType: "fixed" },
    { key: "terapia", name: "Sesión de terapia", durationMinutes: 50, price: 200_000, priceType: "fixed" },
    { key: "seguimiento", name: "Reunión de seguimiento", durationMinutes: 30, price: 100_000, priceType: "fixed" },
  ],
  pets: [
    { key: "bano", name: "Baño y peinado", durationMinutes: 60, price: 80_000, priceType: "from" },
    { key: "corte-canino", name: "Corte de pelo", durationMinutes: 90, price: 120_000, priceType: "from" },
    { key: "consulta-vet", name: "Consulta veterinaria", durationMinutes: 30, price: 120_000, priceType: "fixed" },
    { key: "vacuna", name: "Vacunación", durationMinutes: 15, price: 90_000, priceType: "from" },
  ],
  automotive: [
    { key: "lavado", name: "Lavado completo", durationMinutes: 60, price: 80_000, priceType: "from" },
    { key: "lavado-aspirado", name: "Lavado y aspirado", durationMinutes: 90, price: 120_000, priceType: "from" },
    { key: "aceite", name: "Cambio de aceite", durationMinutes: 45, price: 150_000, priceType: "from" },
    { key: "diagnostico", name: "Diagnóstico", durationMinutes: 60, price: 100_000, priceType: "fixed" },
  ],
  tattoo: [
    { key: "sesion-tatuaje", name: "Sesión de tatuaje", durationMinutes: 120, price: 400_000, priceType: "from" },
    { key: "tatuaje-chico", name: "Tatuaje pequeño", durationMinutes: 60, price: 200_000, priceType: "from" },
    { key: "piercing", name: "Piercing", durationMinutes: 30, price: 120_000, priceType: "from" },
    { key: "diseno", name: "Consulta de diseño", durationMinutes: 30, price: 50_000, priceType: "fixed" },
  ],
  other: [
    { key: "consulta", name: "Consulta", durationMinutes: 30, price: 100_000, priceType: "fixed" },
    { key: "sesion", name: "Sesión", durationMinutes: 60, price: 150_000, priceType: "from" },
  ],
};
