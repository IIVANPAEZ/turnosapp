"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CircleAlert, Loader2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CategoryPicker } from "@/components/business/category-picker";
import { normalizeSlugInput, SlugHint, SlugInput, useSlugAvailability } from "@/components/business/slug-field";
import { cn } from "@/lib/utils";
import type { BusinessSettings } from "@/lib/auth/dal";
import { updateBusiness } from "@/lib/business/actions";
import {
  businessSettingsSchema,
  DESCRIPTION_MAX,
  MAX_DAYS_OPTIONS,
  MIN_NOTICE_OPTIONS,
} from "@/lib/business/schemas";

type SettingsFormProps = {
  business: BusinessSettings;
  /** Dueño/admin: puede editar. El resto ve los datos en solo lectura. */
  canEdit: boolean;
};

function toFormValues(b: BusinessSettings) {
  return {
    name: b.name,
    category: b.category,
    slug: b.slug,
    description: b.description ?? "",
    whatsapp: b.whatsapp ?? "",
    address: b.address ?? "",
    city: b.city ?? "",
    bookingEnabled: b.bookingEnabled,
    bookingMinNotice: b.bookingMinNotice,
    bookingMaxDays: b.bookingMaxDays,
    bookingAutoConfirm: b.bookingAutoConfirm,
  };
}

export function SettingsForm({ business, canEdit }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Slug guardado: cambia después de guardar, para comparar contra el nuevo.
  const [savedSlug, setSavedSlug] = useState(business.slug);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: toFormValues(business),
  });

  const slug = useWatch({ control, name: "slug" });
  const category = useWatch({ control, name: "category" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const bookingEnabled = useWatch({ control, name: "bookingEnabled" });
  const bookingMinNotice = useWatch({ control, name: "bookingMinNotice" });
  const bookingMaxDays = useWatch({ control, name: "bookingMaxDays" });
  const bookingAutoConfirm = useWatch({ control, name: "bookingAutoConfirm" });
  const slugStatus = useSlugAvailability(slug, savedSlug);
  const slugTaken = slugStatus.status === "taken";
  const slugChanged = slug !== savedSlug;

  // El "Guardado" se oculta solo a los 3 segundos.
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await updateBusiness(values);
      if (result.ok) {
        reset(values);
        setSavedSlug(values.slug.trim().toLowerCase());
        setSavedAt(Date.now());
      } else if (result.field) {
        setError(result.field, { message: result.error });
      } else {
        setFormError(result.error);
      }
    });
  });

  const discard = () => {
    reset();
    setFormError(null);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      {!canEdit && (
        <Alert>
          <CircleAlert />
          <AlertDescription>Solo el dueño o un administrador pueden cambiar estos datos.</AlertDescription>
        </Alert>
      )}

      <fieldset disabled={!canEdit || pending} className="contents">
        <Section title="Datos generales" description="Cómo te ven tus clientes en tu página y en los mensajes.">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Nombre del negocio</FieldLabel>
              <Input id="name" autoComplete="organization" aria-invalid={!!errors.name} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <CategoryPicker
              value={category}
              inputProps={register("category")}
              error={errors.category}
              disabled={!canEdit}
            />

            <Field data-invalid={!!errors.description}>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="description">
                  Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <span
                  className={cn(
                    "font-mono text-xs tabular",
                    description.length > DESCRIPTION_MAX ? "text-destructive" : "text-faint",
                  )}
                >
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <Textarea
                id="description"
                rows={3}
                placeholder="Ej.: Atendemos con turno en Villa Morra, de lunes a sábado."
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description ? (
                <FieldError errors={[errors.description]} />
              ) : (
                <FieldDescription>Aparece arriba de tus servicios en la página de reservas.</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </Section>

        <Section title="Página de reservas" description="La dirección que compartís para que te reserven.">
          <FieldGroup>
            <Field data-invalid={!!errors.slug || slugTaken}>
              <FieldLabel htmlFor="slug">Dirección de tu página</FieldLabel>
              <SlugInput
                id="slug"
                aria-invalid={!!errors.slug || slugTaken}
                {...register("slug", {
                  onChange: (e) => {
                    const clean = normalizeSlugInput(e.target.value);
                    if (clean !== e.target.value) setValue("slug", clean, { shouldDirty: true });
                  },
                })}
              />
              {errors.slug ? (
                <FieldError errors={[errors.slug]} />
              ) : (
                <SlugHint status={slugStatus} slug={slug} emptyHint="Ingresá una dirección." />
              )}
            </Field>

            {slugChanged && (
              <Alert className="border-warning/30 bg-warning-soft">
                <TriangleAlert className="text-warning" />
                <AlertDescription className="text-secondary-foreground">
                  Si guardás este cambio, los links que ya compartiste con la dirección anterior dejan de
                  funcionar.
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </Section>

        <Section
          title="Reservas online"
          description="Cómo y cuándo te pueden reservar tus clientes desde tu página."
        >
          <FieldGroup>
            <ToggleRow
              id="bookingEnabled"
              label="Recibir reservas online"
              hint={
                bookingEnabled
                  ? "Tus clientes eligen servicio, día y horario desde tu página."
                  : "Pausadas: tu página muestra tus datos y el botón de WhatsApp, pero no deja reservar."
              }
              checked={bookingEnabled}
              disabled={!canEdit}
              onChange={(v) => setValue("bookingEnabled", v, { shouldDirty: true })}
            />

            <div className={cn("flex flex-col gap-6", !bookingEnabled && "opacity-50")}>
              <OptionChips
                label="Anticipación mínima"
                hint="Cuánto antes del turno se puede reservar como mínimo."
                options={MIN_NOTICE_OPTIONS}
                value={bookingMinNotice}
                disabled={!canEdit || !bookingEnabled}
                onChange={(v) => setValue("bookingMinNotice", v, { shouldDirty: true })}
              />
              <OptionChips
                label="Hasta cuándo se puede reservar"
                hint="Cuántos días hacia adelante se ven en tu página."
                options={MAX_DAYS_OPTIONS}
                value={bookingMaxDays}
                disabled={!canEdit || !bookingEnabled}
                onChange={(v) => setValue("bookingMaxDays", v, { shouldDirty: true })}
              />
              <ToggleRow
                id="bookingAutoConfirm"
                label="Confirmar automáticamente"
                hint={
                  bookingAutoConfirm
                    ? "Las reservas entran como “Confirmado”, sin que tengas que revisarlas."
                    : "Las reservas entran como “Por confirmar”: las revisás y confirmás vos."
                }
                checked={bookingAutoConfirm}
                disabled={!canEdit || !bookingEnabled}
                onChange={(v) => setValue("bookingAutoConfirm", v, { shouldDirty: true })}
              />
            </div>
          </FieldGroup>
        </Section>

        <Section title="Contacto y ubicación" description="Para que tus clientes te encuentren y te escriban.">
          <FieldGroup>
            <Field data-invalid={!!errors.whatsapp}>
              <FieldLabel htmlFor="whatsapp">WhatsApp del negocio</FieldLabel>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0981 123 456"
                aria-invalid={!!errors.whatsapp}
                {...register("whatsapp")}
              />
              <FieldError errors={[errors.whatsapp]} />
            </Field>

            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="address">Dirección</FieldLabel>
              <Input
                id="address"
                autoComplete="street-address"
                placeholder="Ej.: Av. España 1234 c/ Brasil"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
              <FieldError errors={[errors.address]} />
            </Field>

            <Field data-invalid={!!errors.city}>
              <FieldLabel htmlFor="city">Ciudad</FieldLabel>
              <Input
                id="city"
                autoComplete="address-level2"
                placeholder="Asunción"
                aria-invalid={!!errors.city}
                {...register("city")}
              />
              <FieldError errors={[errors.city]} />
            </Field>
          </FieldGroup>
        </Section>
      </fieldset>

      {/* Barra flotante: aparece con cambios sin guardar o al confirmar el guardado. */}
      {canEdit && (isDirty || savedAt || formError) && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-popover/95 p-3 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.9)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pl-4">
          <p className={cn("flex items-center gap-2 text-sm", formError ? "text-destructive" : "text-muted-foreground")}>
            {formError ? (
              <>
                <CircleAlert className="size-4" /> {formError}
              </>
            ) : isDirty ? (
              <>
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Tenés cambios sin guardar
              </>
            ) : (
              <span className="flex items-center gap-2 text-success">
                <Check className="size-4" /> Cambios guardados
              </span>
            )}
          </p>
          {isDirty && (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={discard} disabled={pending} className="flex-1 sm:flex-none">
                Descartar
              </Button>
              <Button type="submit" disabled={pending || slugTaken} className="flex-1 sm:flex-none">
                {pending && <Loader2 className="animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/** Interruptor con título y explicación. */
function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v)} className="mt-0.5" />
    </div>
  );
}

/** Opciones fijas como pastillas (elegir una). */
function OptionChips({
  label,
  hint,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  options: readonly { value: number; label: string }[];
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  // Si en la base hay un valor que no está en la lista, igual se muestra.
  const list = options.some((o) => o.value === value) ? options : [...options, { value, label: `${value}` }];
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {list.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-9 rounded-lg border px-3 text-sm transition-colors disabled:cursor-not-allowed",
                selected
                  ? "border-primary/70 bg-primary-soft font-medium text-primary"
                  : "bg-inset text-muted-foreground hover:border-line-strong hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Sección de ajustes: título y explicación a la izquierda, campos a la derecha. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t pt-8 first-of-type:border-t-0 first-of-type:pt-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]">{children}</div>
    </section>
  );
}
