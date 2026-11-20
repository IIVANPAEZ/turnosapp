import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

/** Botón "Cerrar sesión" para el pie del sidebar. */
export function SignOutButton() {
  return (
    <form action={signOut} className="border-t px-3 py-3">
      <button
        type="submit"
        className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <LogOut className="size-4.25 text-faint group-hover:text-muted-foreground" strokeWidth={1.7} />
        Cerrar sesión
      </button>
    </form>
  );
}
