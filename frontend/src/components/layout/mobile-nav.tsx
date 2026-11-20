"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

/** Menú lateral desplegable para celulares. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="-ml-1.5 md:hidden" aria-label="Abrir menú" />}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 border-r bg-sidebar p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <div className="px-4 pt-5 pb-4">
          <Brand />
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
        <SignOutButton />
      </SheetContent>
    </Sheet>
  );
}
