import { describe, expect, it } from "vitest";
import type { DayAvailability } from "@/lib/agenda/actions";
import { checkTime, freeSlots } from "@/lib/agenda/slots";

const day = (over: Partial<DayAvailability> = {}): DayAvailability => ({
  date: "2026-11-23",
  isPast: false,
  nowMinutes: null,
  hours: [
    { start: "08:00", end: "12:00" },
    { start: "14:00", end: "16:00" },
  ],
  blocks: [],
  busy: [],
  ...over,
});
const min = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe("horarios libres (agenda)", () => {
  it("cada 15 min, entrando completos en el horario", () => {
    const slots = freeSlots(day(), 60);
    expect(slots[0]).toBe("08:00");
    expect(slots).toContain("11:00");
    expect(slots).not.toContain("11:15"); // terminaría 12:15, fuera de horario
    expect(slots).not.toContain("12:00"); // pausa
    expect(slots).toContain("14:00");
    expect(slots.at(-1)).toBe("15:00");
  });

  it("no pisa turnos ni bloqueos", () => {
    const slots = freeSlots(
      day({
        busy: [{ startMin: min("09:00"), endMin: min("09:30"), label: "Ana" }],
        blocks: [{ startMin: min("14:00"), endMin: min("15:00"), label: "Trámite" }],
      }),
      30,
    );
    expect(slots).toContain("08:30");
    expect(slots).not.toContain("08:45");
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("09:30");
    expect(slots).not.toContain("14:30");
    expect(slots).toContain("15:00");
  });

  it("hoy no ofrece horarios que ya pasaron; un día pasado, ninguno", () => {
    expect(freeSlots(day({ nowMinutes: min("10:05") }), 30)[0]).toBe("10:15");
    expect(freeSlots(day({ isPast: true }), 30)).toEqual([]);
  });
});

describe("revisar una hora elegida a mano", () => {
  it("se pisa con otro turno → no deja guardar", () => {
    const r = checkTime(day({ busy: [{ startMin: min("09:00"), endMin: min("10:00"), label: "Ana 09:00" }] }), "09:30", 30, "lunes");
    expect(r.clash).toBe("Ana 09:00");
  });

  it("fuera de horario, bloqueado o en el pasado → avisos (se puede cargar igual)", () => {
    const r = checkTime(
      day({ nowMinutes: min("13:00"), blocks: [{ startMin: min("12:00"), endMin: min("13:00"), label: "Almuerzo" }] }),
      "12:30",
      30,
      "lunes",
    );
    expect(r.clash).toBeNull();
    expect(r.warnings.join(" ")).toContain("ya pasó");
    expect(r.warnings.join(" ")).toContain("bloqueado (Almuerzo)");
    expect(r.warnings.join(" ")).toContain("fuera de tu horario del lunes");
  });

  it("dentro del horario y libre → sin avisos", () => {
    expect(checkTime(day(), "10:00", 45, "lunes")).toEqual({ clash: null, warnings: [] });
  });
});
