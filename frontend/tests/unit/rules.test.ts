import { describe, expect, it } from "vitest";
import { slugify, slugProblem } from "@/lib/business/slug";
import { businessSettingsSchema } from "@/lib/business/schemas";
import { clientSchema } from "@/lib/clients/schemas";
import { dayProblems, insertPause, suggestPause, weeklyTotal } from "@/lib/schedule/week";
import { emptyWeek } from "@/lib/schedule/constants";

describe("dirección pública (slug)", () => {
  it("convierte nombres con tildes, ñ y símbolos", () => {
    expect(slugify("Salón Ána & Cía.")).toBe("salon-ana-cia");
    expect(slugify("  Peluquería Ñandutí  ")).toBe("peluqueria-nanduti");
  });

  it("reglas de formato y direcciones reservadas", () => {
    expect(slugProblem("ab")).toMatch(/al menos 3/);
    expect(slugProblem("-hola")).toMatch(/Solo minúsculas/);
    expect(slugProblem("hola--chau")).toMatch(/Solo minúsculas/);
    expect(slugProblem("dashboard")).toMatch(/reservada/);
    expect(slugProblem("barberia-don-ivan")).toBeNull();
  });
});

describe("horarios de la semana", () => {
  it("detecta cierre antes de apertura y horarios que se pisan", () => {
    expect(dayProblems([{ start: "10:00", end: "09:00" }])[0]).toMatch(/después de la de apertura/);
    expect(
      dayProblems([
        { start: "08:00", end: "12:00" },
        { start: "11:00", end: "14:00" },
      ])[1],
    ).toMatch(/se pisa/);
  });

  it("total semanal", () => {
    const w = emptyWeek();
    w[1] = [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:30" }];
    w[2] = [{ start: "09:00", end: "13:00" }];
    expect(weeklyTotal(w)).toBe("12 h 30 min");
  });

  it("pausa sugerida al mediodía y partir el horario", () => {
    expect(suggestPause([{ start: "08:00", end: "18:00" }])).toEqual({ start: "12:00", minutes: 60 });
    expect(suggestPause([{ start: "08:00", end: "08:45" }])).toBeNull();
    expect(insertPause([{ start: "08:00", end: "18:00" }], "12:00", "13:00")).toEqual({
      ranges: [
        { start: "08:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
    });
    expect(insertPause([{ start: "08:00", end: "12:00" }], "13:00", "14:00")).toHaveProperty("error");
  });
});

describe("validaciones de formularios", () => {
  it("cliente: celular razonable y nota con tope", () => {
    const ok = { id: crypto.randomUUID(), name: "Ana Benítez", phone: "0981 123 456", notes: "" };
    expect(clientSchema.safeParse(ok).success).toBe(true);
    expect(clientSchema.safeParse({ ...ok, phone: "" }).success).toBe(true);
    expect(clientSchema.safeParse({ ...ok, phone: "12" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...ok, name: "A" }).success).toBe(false);
    expect(clientSchema.safeParse({ ...ok, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("reservas online: mismos límites que la base", () => {
    const base = {
      name: "Barbería",
      category: "beauty",
      slug: "barberia",
      description: "",
      whatsapp: "",
      address: "",
      city: "",
      bookingEnabled: true,
      bookingMinNotice: 30,
      bookingMaxDays: 90,
      bookingAutoConfirm: false,
    };
    expect(businessSettingsSchema.safeParse(base).success).toBe(true);
    expect(businessSettingsSchema.safeParse({ ...base, bookingMaxDays: 0 }).success).toBe(false);
    expect(businessSettingsSchema.safeParse({ ...base, bookingMinNotice: 20000 }).success).toBe(false);
  });
});
