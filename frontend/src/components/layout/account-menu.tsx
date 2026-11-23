"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { APP_NAME } from "@/lib/config";
import { canOfferInstall, promptInstall, useInstall } from "@/components/pwa/install-store";
import { IosInstallSteps } from "@/components/pwa/ios-install-steps";
import { setThemePref, useThemePref, type ThemePref } from "@/components/theme/use-theme";

const THEMES: { value: ThemePref; label: string; icon: React.ElementType }[] = [
  { value: "claro", label: "Claro", icon: Sun },
  { value: "oscuro", label: "Oscuro", icon: Moon },
  { value: "auto", label: "Automático", icon: Monitor },
];

type AccountMenuProps = {
  name: string;
  roleLabel: string;
  businessName: string;
  color: string;
};

/** Menú de la cuenta (al tocar la inicial): instalar la app, configuración y cerrar sesión. */
export function AccountMenu({ name, roleLabel, businessName, color }: AccountMenuProps) {
  const install = useInstall();
  const theme = useThemePref();
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
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Tema</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setThemePref(v as ThemePref)}>
              {THEMES.map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value} closeOnClick={false}>
                  <t.icon /> {t.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
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
            <AlertDialogTitle>Instalá {APP_NAME} en tu iPhone</AlertDialogTitle>
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
