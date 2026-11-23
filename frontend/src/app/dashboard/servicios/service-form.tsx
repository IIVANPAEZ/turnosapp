"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DurationPicker } from "@/components/services/duration-picker";
import { PriceInput } from "@/components/services/price-input";
import { cn } from "@/lib/utils";
import { formatPYG } from "@/lib/format";
import type { Service } from "@/lib/services/data";
import { createService, updateService } from "@/lib/services/actions";
import { serviceSchema, SERVICE_DESCRIPTION_MAX, type ServiceInput } from "@/lib/services/schemas";

type ServiceFormProps = {
  /** null = servicio nuevo */
  service: Service | null;
  onDone: (message: string) => void;
  onCancel: () => void;
};

export function ServiceForm({ service, onDone, onCancel }: ServiceFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    // Servicio nuevo: sin precio inicial (el usuario tiene que cargarlo).
    defaultValues: service
      ? {
          name: service.name,
          description: service.description ?? "",
          durationMinutes: service.durationMinutes,
          price: service.price,
          priceType: service.priceType,
          isActive: service.isActive,
        }
      : { name: "", description: "", durationMinutes: 60, priceType: "fixed", isActive: true },
  });

  const description = useWatch({ control, name: "description" }) ?? "";
  const price = useWatch({ control, name: "price" });
  const priceType = useWatch({ control, name: "priceType" });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = service ? await updateService(service.id, values) : await createService(values);
      if (result.ok) return onDone(result.message);
      if (result.field) setError(result.field, { message: result.error });
      else setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <FieldGroup>
          {formError && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="service-name">Nombre</FieldLabel>
            <Input
              id="service-name"
              placeholder="Ej.: Consulta inicial"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.durationMinutes}>
            <FieldLabel htmlFor="service-duration">Duración</FieldLabel>
            <Controller
              control={control}
              name="durationMinutes"
              render={({ field }) => (
                <DurationPicker
                  id="service-duration"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.durationMinutes}
                />
              )}
            />
            <FieldError errors={[errors.durationMinutes]} />
          </Field>

          <Field data-invalid={!!errors.price}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="service-price">Precio</FieldLabel>
              <Controller
                control={control}
                name="priceType"
                render={({ field }) => (
                  <div className="flex rounded-lg border bg-inset p-0.5 text-xs" role="radiogroup" aria-label="Tipo de precio">
                    {(
                      [
                        ["fixed", "Precio fijo"],
                        ["from", "Desde"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          "rounded-md px-2.5 py-1 transition-colors",
                          field.value === value
                            ? "bg-segment font-medium text-foreground shadow-[var(--segment-shadow)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <PriceInput
                  id="service-price"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.price}
                />
              )}
            />
            {errors.price ? (
              <FieldError errors={[errors.price]} />
            ) : (
              <FieldDescription>
                Tus clientes ven:{" "}
                <span className="font-mono text-foreground">
                  {priceType === "from" ? "desde " : ""}
                  {formatPYG(price ?? 0)}
                </span>
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!errors.description}>
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel htmlFor="service-description">
                Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <span
                className={cn(
                  "font-mono text-xs tabular",
                  description.length > SERVICE_DESCRIPTION_MAX ? "text-destructive" : "text-faint",
                )}
              >
                {description.length}/{SERVICE_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="service-description"
              rows={2}
              placeholder="Ej.: Incluye materiales."
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </Field>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-inset p-3.5">
                <span>
                  <span className="block text-sm font-medium">Visible para reservar</span>
                  <span className="block text-xs text-muted-foreground">
                    {field.value ? "Aparece en tu página de reservas." : "Pausado: no aparece para tus clientes."}
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </FieldGroup>
      </div>

      <div className="flex gap-2 border-t px-5 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1 sm:ml-auto sm:flex-none">
          {pending && <Loader2 className="animate-spin" />}
          {service ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </div>
    </form>
  );
}
