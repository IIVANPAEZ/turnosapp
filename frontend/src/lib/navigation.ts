import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Tags,
  Clock,
  UserRound,
  Wallet,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const dashboardNav: NavSection[] = [
  {
    label: "Tu día",
    items: [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
      { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/dashboard/clientes", label: "Clientes", icon: Users },
      { href: "/dashboard/ingresos", label: "Ingresos", icon: Wallet },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/dashboard/servicios", label: "Servicios", icon: Tags },
      { href: "/dashboard/horarios", label: "Horarios", icon: Clock },
      { href: "/dashboard/profesionales", label: "Profesionales", icon: UserRound },
    ],
  },
  {
    label: "Conexiones",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const allItems = dashboardNav.flatMap((s) => s.items);

/** Devuelve el ítem activo: coincidencia exacta o la ruta hija más larga. */
export function findActiveItem(pathname: string): NavItem | undefined {
  return allItems
    .filter((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname.startsWith(item.href + "/"),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
