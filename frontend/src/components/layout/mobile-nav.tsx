"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Menú lateral desplegable para celulares. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" />}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 gap-0 border-none bg-slate-900 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="border-b border-white/[0.06] px-5 py-5">
          <Brand />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
