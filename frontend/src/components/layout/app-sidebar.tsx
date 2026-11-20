import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

/** Sidebar fija para pantallas medianas en adelante. */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 md:flex">
      <div className="border-b border-white/[0.06] px-5 py-5">
        <Brand />
      </div>
      <SidebarNav />
      <SignOutButton />
    </aside>
  );
}
