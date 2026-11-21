"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CategoryPicker } from "@/components/business/category-picker";
import { normalizeSlugInput, SlugHint, SlugInput, useSlugAvailability } from "@/components/business/slug-field";
import { createBusiness } from "@/lib/business/actions";
import { onboardingSchema } from "@/lib/business/schemas";
import { slugify } from "@/lib/business/slug";

type OnboardingFormProps = {
  defaultWhatsapp: string;
};

export function OnboardingForm({ defaultWhatsapp }: OnboardingFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  // Mientras el usuario no edite la dirección a mano, se genera desde el nombre.
  const [slugEdited, setSlugEdited] = useState(false);

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
    defaultValues: { name: "", slug: "", whatsapp: defaultWhatsapp, city: "" },
  });

  const slug = useWatch({ control, name: "slug" });
  const category = useWatch({ control, name: "category" });
  const slugStatus = useSlugAvailability(slug);
  const slugTaken = slugStatus.status === "taken";

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createBusiness(values);
      if (!result) return; // salió bien: la acción redirige al panel
      if (result.field) setError(result.field, { message: result.error });
      else setFormError(result.error);
    });
  });

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
            placeholder="Ej.: Estudio Ana"
            autoComplete="organization"
            aria-invalid={!!errors.name}
            {...register("name", {
              onChange: (e) => {
                if (!slugEdited) setValue("slug", slugify(e.target.value), { shouldValidate: false });
              },
            })}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <CategoryPicker value={category} inputProps={register("category")} error={errors.category} />

        <Field data-invalid={!!errors.slug || slugTaken}>
          <FieldLabel htmlFor="slug">Dirección de tu página</FieldLabel>
          <SlugInput
            id="slug"
            aria-invalid={!!errors.slug || slugTaken}
            {...register("slug", {
              onChange: (e) => {
                setSlugEdited(true);
                const clean = normalizeSlugInput(e.target.value);
                if (clean !== e.target.value) setValue("slug", clean);
              },
            })}
          />
          {errors.slug ? <FieldError errors={[errors.slug]} /> : <SlugHint status={slugStatus} slug={slug} />}
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
