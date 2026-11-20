import { CalendarCheck } from "lucide-react";
import { APP_NAME } from "@/lib/config";

type BrandProps = {
  /** Línea debajo del nombre (ej. el nombre del negocio). */
  subtitle?: React.ReactNode;
};

export function Brand({ subtitle = "Gestión de turnos" }: BrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_1px_rgb(242_169_59/0.4),0_6px_20px_-6px_rgb(242_169_59/0.5)]">
        <CalendarCheck className="size-4.5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-tight tracking-tight">{APP_NAME}</p>
        <div className="truncate text-[11.5px] leading-tight text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}
