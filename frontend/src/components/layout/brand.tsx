import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

type BrandProps = {
  /** "dark": sobre el sidebar oscuro (default). "light": sobre fondos claros. */
  tone?: "dark" | "light";
};

export function Brand({ tone = "dark" }: BrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <CalendarCheck className="size-[18px]" />
      </div>
      <div>
        <p
          className={cn(
            "text-[15px] font-semibold leading-tight tracking-tight",
            tone === "dark" ? "text-white" : "text-slate-900",
          )}
        >
          {APP_NAME}
        </p>
        <p className="text-[11px] leading-tight text-slate-500">Gestión de turnos</p>
      </div>
    </div>
  );
}
