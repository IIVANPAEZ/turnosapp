import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

/** Botón "Cerrar sesión" para el pie del sidebar (fondo oscuro). */
export function SignOutButton() {
  return (
    <form action={signOut} className="border-t border-white/[0.06] px-3 py-3">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <LogOut className="size-[18px]" strokeWidth={1.5} />
        Cerrar sesión
      </button>
    </form>
  );
}
