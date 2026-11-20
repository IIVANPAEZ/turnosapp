"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, CircleAlert, CircleCheck, Loader2, Sparkles, Stethoscope } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PUBLIC_SITE_DOMAIN } from "@/lib/config";
import { checkSlugAvailability, createBusiness, type SlugAvailability } from "@/lib/business/actions";
import { BUSINESS_CATEGORIES, onboardingSchema } from "@/lib/business/schemas";
import { slugify, slugProblem } from "@/lib/business/slug";

const CATEGORY_ICONS = { beauty: Sparkles, health: Stethoscope, other: Briefcase } as const;

type SlugStatus = { status: "idle" } | { status: "checking" } | SlugAvailability;

type OnboardingFormProps = {
  defaultWhatsapp: string;
};

export function OnboardingForm({ defaultWhatsapp }: OnboardingFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ status: "idle" });
  // Mientras el usuario no edite la dirección a mano, se genera desde el nombre.
  const [slugEdited, setSlugEdited] = useState(false);
  const lastCheck = useRef(0);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    // category sin valor inicial: el usuario tiene que elegir un rubro.
    defaultValues: {
      name: "",
      slug: "",
      whatsapp: defaultWhatsapp,
      city: "",
    },
  });

  const slug = useWatch({ control, name: "slug" });
  const category = useWatch({ control, name: "category" });

  // Verifica la disponibilidad 500 ms después de la última tecla.
  useEffect(() => {
    const id = ++lastCheck.current;
    const timer = setTimeout(async () => {
      if (!slug || slugProblem(slug)) {
        setSlugStatus({ status: "idle" });
        return;
      }
      setSlugStatus({ status: "checking" });
      const result = await checkSlugAvailability(slug);
      if (id === lastCheck.current) setSlugStatus(result); // ignora respuestas viejas
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createBusiness(values);
      if (!result) return; // salió bien: la acción redirige al panel
      if (result.field) {
        setError(result.field, { message: result.error });
        if (result.field === "slug") setSlugStatus({ status: "taken" });
      } else {
        setFormError(result.error);
      }
    });
  });

  const slugTaken = slugStatus.status === "taken";

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
          <Input
            id="name"
            placeholder="Ej.: Salón Ana"
            autoComplete="organization"
            aria-invalid={!!errors.name}
            {...register("name", {
              onChange: (e) => {
                if (!slugEdited) {
                  setValue("slug", slugify(e.target.value), { shouldValidate: false });
                }
              },
            })}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <FieldSet data-invalid={!!errors.category}>
          <FieldLegend variant="label">Rubro</FieldLegend>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUSINESS_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              const selected = category === c.value;
              return (
                <label
                  key={c.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors",
                    "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <input type="radio" value={c.value} className="sr-only" {...register("category")} />
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={cn("size-4", selected ? "text-primary" : "text-muted-foreground")} />
                    {c.label}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{c.hint}</span>
                </label>
              );
            })}
          </div>
          <FieldError errors={[errors.category]} />
        </FieldSet>

        <Field data-invalid={!!errors.slug || slugTaken}>
          <FieldLabel htmlFor="slug">Dirección de tu página</FieldLabel>
          <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="select-none pl-2.5 text-sm text-muted-foreground">{PUBLIC_SITE_DOMAIN}/</span>
            <Input
              id="slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="border-0 pl-0.5 focus-visible:ring-0"
              aria-invalid={!!errors.slug || slugTaken}
              {...register("slug", {
                onChange: (e) => {
                  setSlugEdited(true);
                  // Normaliza mientras escribe: minúsculas, sin espacios ni tildes.
                  const clean = e.target.value
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[̀-ͯ]/g, "")
                    .replace(/[^a-z0-9-]/g, "-");
                  if (clean !== e.target.value) setValue("slug", clean);
                },
              })}
            />
          </div>
          {errors.slug ? (
            <FieldError errors={[errors.slug]} />
          ) : (
            <SlugHint status={slugStatus} slug={slug} />
          )}
        </Field>

        <Field data-invalid={!!errors.whatsapp}>
          <FieldLabel htmlFor="whatsapp">
            WhatsApp del negocio <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0981 123 456"
            aria-invalid={!!errors.whatsapp}
            {...register("whatsapp")}
          />
          {errors.whatsapp ? (
            <FieldError errors={[errors.whatsapp]} />
          ) : (
            <FieldDescription>Tus clientes lo van a ver en tu página de reservas.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.city}>
          <FieldLabel htmlFor="city">
            Ciudad <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input
            id="city"
            placeholder="Asunción"
            autoComplete="address-level2"
            aria-invalid={!!errors.city}
            {...register("city")}
          />
          <FieldError errors={[errors.city]} />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending || slugTaken}>
          {pending && <Loader2 className="animate-spin" />}
          Crear mi negocio
        </Button>
      </FieldGroup>
    </form>
  );
}

function SlugHint({ status, slug }: { status: SlugStatus; slug: string }) {
  if (!slug) {
    return <FieldDescription>Se completa sola con el nombre. Podés cambiarla.</FieldDescription>;
  }
  const problem = slugProblem(slug);
  if (problem) return <FieldDescription className="text-destructive">{problem}</FieldDescription>;

  switch (status.status) {
    case "checking":
      return (
        <FieldDescription className="flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" /> Verificando…
        </FieldDescription>
      );
    case "available":
      return (
        <FieldDescription className="flex items-center gap-1.5 text-emerald-600">
          <CircleCheck className="size-3.5" /> Disponible
        </FieldDescription>
      );
    case "taken":
      return (
        <FieldDescription className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="size-3.5" /> Ya está tomada, probá con otra
        </FieldDescription>
      );
    case "invalid":
      return <FieldDescription className="text-destructive">{status.message}</FieldDescription>;
    default:
      return <FieldDescription>{PUBLIC_SITE_DOMAIN}/{slug}</FieldDescription>;
  }
}
