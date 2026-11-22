import { describe, expect, it } from "vitest";
import { MAX_RANGE_DAYS, resolvePeriod } from "@/lib/income/period";
import { buildIcs } from "@/lib/public/ics";

const TODAY = "2026-11-22"; // domingo

describe("períodos de Ingresos", () => {
  it("por defecto: este mes, contra el mes pasado", () => {
    expect(resolvePeriod({}, TODAY)).toMatchObject({
      key: "mes",
      from: "2026-11-01",
      to: "2026-11-30",
      prevFrom: "2026-10-01",
      prevTo: "2026-10-31",
    });
  });

  it("hoy contra ayer", () => {
    expect(resolvePeriod({ periodo: "hoy" }, TODAY)).toMatchObject({ from: TODAY, to: TODAY, prevFrom: "2026-11-21", prevTo: "2026-11-21" });
  });

  it("esta semana: de lunes a domingo", () => {
    expect(resolvePeriod({ periodo: "semana" }, TODAY)).toMatchObject({
      from: "2026-11-16",
      to: "2026-11-22",
      prevFrom: "2026-11-09",
      prevTo: "2026-11-15",
    });
  });

  it("mes anterior, cruzando el año", () => {
    expect(resolvePeriod({ periodo: "mes-anterior" }, "2027-01-15")).toMatchObject({
      from: "2026-12-01",
      to: "2026-12-31",
      prevFrom: "2026-11-01",
      prevTo: "2026-11-30",
    });
  });

  it("febrero termina el 28 (o 29)", () => {
    expect(resolvePeriod({ periodo: "mes" }, "2027-02-10").to).toBe("2027-02-28");
    expect(resolvePeriod({ periodo: "mes" }, "2028-02-10").to).toBe("2028-02-29");
  });

  it("rango elegido: ordena las fechas, compara con el mismo largo y tiene tope", () => {
    expect(resolvePeriod({ periodo: "rango", desde: "2026-11-10", hasta: "2026-11-01" }, TODAY)).toMatchObject({
      from: "2026-11-01",
      to: "2026-11-10",
      prevFrom: "2026-10-22",
      prevTo: "2026-10-31",
    });
    const long = resolvePeriod({ periodo: "rango", desde: "2026-01-01", hasta: "2026-11-22" }, TODAY);
    expect((Date.parse(long.to) - Date.parse(long.from)) / 86_400_000 + 1).toBe(MAX_RANGE_DAYS);
  });

  it("rango con fechas inválidas → este mes", () => {
    expect(resolvePeriod({ periodo: "rango", desde: "2026-02-30", hasta: "x" }, TODAY).key).toBe("mes");
  });
});

describe("archivo de calendario (.ics)", () => {
  const ics = buildIcs({
    uid: "abc",
    date: "2026-11-23",
    time: "10:30",
    durationMinutes: 45,
    timeZone: "America/Asuncion",
    title: "Corte · Barbería Don Ivan",
    location: "Av. España 1234, Asunción; PB",
  });

  it("hora en UTC (10:30 Asunción = 13:30 UTC) y duración", () => {
    expect(ics).toContain("DTSTART:20261123T133000Z");
    expect(ics).toContain("DTEND:20261123T141500Z");
  });

  it("escapa comas y punto y coma, y usa saltos CRLF", () => {
    expect(ics).toContain("LOCATION:Av. España 1234\\, Asunción\\; PB");
    expect(ics.includes("\r\n")).toBe(true);
    expect(ics).toContain("TRIGGER:-PT1H");
  });
});
