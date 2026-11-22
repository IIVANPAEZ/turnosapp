"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { canOfferInstall, promptInstall, useInstall } from "@/components/pwa/install-store";
import { IosInstallSteps } from "@/components/pwa/ios-install-steps";

type AccountMenuProps = {
  name: string;
  roleLabel: string;
  businessName: string;
  color: string;
};

/** Menú de la cuenta (al tocar la inicial): instalar la app, configuración y cerrar sesión. */
export function AccountMenu({ name, roleLabel, businessName, color }: AccountMenuProps) {
  const install = useInstall();
  const [iosHelp, setIosHelp] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Tu cuenta"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-background outline outline-line-strong transition-[outline-color] hover:outline-primary focus-visible:outline-primary"
          style={{ backgroundColor: color }}
        >
          {initial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="truncate text-sm font-medium text-foreground">{name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {roleLabel} · {businessName}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {canOfferInstall(install) && (
            <DropdownMenuItem
              onClick={() => {
                if (install.canPrompt) void promptInstall();
                else setIosHelp(true);
              }}
            >
              <Download /> Instalar app
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/dashboard/configuracion" />}>
            <Settings /> Configuración
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* iPhone: Safari no tiene botón de instalar; se explica cómo. */}
      <AlertDialog open={iosHelp} onOpenChange={setIosHelp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Instalá TurnosApp en tu iPhone</AlertDialogTitle>
            <AlertDialogDescription>Se abre como una app, desde tu pantalla de inicio.</AlertDialogDescription>
          </AlertDialogHeader>
          <IosInstallSteps />
          <AlertDialogFooter>
            <Button onClick={() => setIosHelp(false)}>Entendido</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
