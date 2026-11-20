import { CalendarCheck } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <CalendarCheck className="size-[18px]" />
      </div>
      <div>
        <p className="text-[15px] font-semibold leading-tight tracking-tight text-white">
          {APP_NAME}
        </p>
        <p className="text-[11px] leading-tight text-slate-500">Gestión de turnos</p>
      </div>
    </div>
  );
}
