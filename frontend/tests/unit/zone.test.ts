import { describe, expect, it } from "vitest";
import {
  addDays,
  hhmmToMinutes,
  isoWeekday,
  isYMD,
  localParts,
  longDayLabel,
  minutesToHHMM,
  shortDayLabel,
  startOfWeek,
  weekdayOf,
  weekRangeLabel,
  zonedToUtc,
} from "@/lib/time/zone";

const PY = "America/Asuncion";

describe("zona horaria del negocio", () => {
  it("convierte una hora de Asunción a UTC (UTC-3)", () => {
    expect(zonedToUtc("2026-11-23", "10:30", PY).toISOString()).toBe("2026-11-23T13:30:00.000Z");
  });

  it("de noche cruza al día siguiente en UTC", () => {
    expect(zonedToUtc("2026-12-31", "22:00", PY).toISOString()).toBe("2027-01-01T01:00:00.000Z");
  });

  it("lee un instante en la hora local", () => {
    const p = localParts(new Date("2026-11-23T02:15:00Z"), PY);
    expect(p.ymd).toBe("2026-11-22");
    expect(p.hhmm).toBe("23:15");
    expect(p.minutes).toBe(23 * 60 + 15);
  });

  it("ida y vuelta da la misma hora", () => {
    const d = zonedToUtc("2026-07-09", "08:05", PY);
    expect(localParts(d, PY)).toMatchObject({ ymd: "2026-07-09", hhmm: "08:05" });
  });
});

describe("fechas YYYY-MM-DD", () => {
  it("valida fechas reales", () => {
    expect(isYMD("2026-02-28")).toBe(true);
    expect(isYMD("2028-02-29")).toBe(true);
    expect(isYMD("2026-02-29")).toBe(false);
    expect(isYMD("2026-13-01")).toBe(false);
    expect(isYMD("23/11/2026")).toBe(false);
    expect(isYMD(null)).toBe(false);
  });

  it("suma días cruzando mes y año", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-23", 90)).toBe("2027-02-21");
  });

  it("día de la semana y lunes de la semana", () => {
    expect(weekdayOf("2026-11-22")).toBe(0); // domingo
    expect(isoWeekday("2026-11-22")).toBe(7);
    expect(isoWeekday("2026-11-23")).toBe(1);
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-23")).toBe("2026-11-23");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("textos en español", () => {
    expect(longDayLabel("2026-11-23", 2026)).toBe("Lunes 23 de noviembre");
    expect(longDayLabel("2027-01-04", 2026)).toBe("Lunes 4 de enero de 2027");
    expect(shortDayLabel("2026-11-23")).toBe("Lun 23");
    expect(weekRangeLabel("2026-11-16")).toBe("16 – 22 de noviembre");
    expect(weekRangeLabel("2026-11-30")).toBe("30 de noviembre – 6 de diciembre");
  });

  it("horas ↔ minutos", () => {
    expect(hhmmToMinutes("08:30")).toBe(510);
    expect(minutesToHHMM(510)).toBe("08:30");
    expect(minutesToHHMM(0)).toBe("00:00");
  });
});
