"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Check, CircleAlert, Loader2, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { BusinessMember } from "@/lib/auth/dal";
import { updateMember } from "@/lib/business/actions";
import { MEMBER_COLORS, ROLE_LABELS, updateMemberSchema } from "@/lib/business/members";

type MemberCardProps = {
  member: BusinessMember;
  /** El usuario actual puede editar a este profesional (él mismo, o dueño/admin). */
  canEdit: boolean;
  /** Es la tarjeta del usuario actual. */
  isMe: boolean;
};

export function MemberCard({ member, canEdit, isMe }: MemberCardProps) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaultValues = { memberId: member.id, displayName: member.displayName, color: member.color };
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(updateMemberSchema), defaultValues });

  // Vista previa en vivo mientras se edita.
  const previewName = useWatch({ control, name: "displayName" });
  const previewColor = useWatch({ control, name: "color" });
  const name = editing ? previewName : member.displayName;
  const color = editing ? previewColor : member.color;

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updateMember(values);
      if (result.ok) {
        reset(values);
        setEditing(false);
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  });

  const cancel = () => {
    reset(defaultValues);
    setError(null);
    setEditing(false);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <Avatar name={name} color={color} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{name || "Sin nombre"}</p>
              {isMe && <span className="text-xs text-muted-foreground">(vos)</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
              {member.isBookable && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarCheck className="size-3.5" /> Recibe turnos
                </span>
              )}
            </div>
          </div>
          {canEdit && !editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              <Pencil /> Editar
            </Button>
          )}
        </div>

        {saved && !editing && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="size-4" /> Cambios guardados
          </p>
        )}

        {editing && (
          <form onSubmit={onSubmit} noValidate className="border-t pt-5">
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field data-invalid={!!errors.displayName}>
                <FieldLabel htmlFor={`name-${member.id}`}>Nombre visible</FieldLabel>
                <Input
                  id={`name-${member.id}`}
                  autoComplete="off"
                  aria-invalid={!!errors.displayName}
                  {...register("displayName")}
                />
                {errors.displayName ? (
                  <FieldError errors={[errors.displayName]} />
                ) : (
                  <FieldDescription>Lo ven tus clientes al reservar y aparece en la agenda.</FieldDescription>
                )}
              </Field>

              <FieldSet>
                <FieldLegend variant="label">Color de agenda</FieldLegend>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map((c) => {
                    const selected = previewColor?.toLowerCase() === c.value;
                    return (
                      <label
                        key={c.value}
                        title={c.label}
                        className={cn(
                          "flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 transition",
                          "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                          selected && "ring-2 ring-foreground",
                        )}
                        style={{ backgroundColor: c.value }}
                      >
                        <input type="radio" value={c.value} className="sr-only" {...register("color")} />
                        <span className="sr-only">{c.label}</span>
                        {selected && <Check className="size-4 text-white" />}
                      </label>
                    );
                  })}
                </div>
                <FieldError errors={[errors.color]} />
              </FieldSet>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white transition-colors"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
