import { describe, expect, it } from "vitest";
import { formatDuration, formatPYG, formatPYGCompact, formatThousands } from "@/lib/format";
import { messages, relativeDay, toWhatsAppNumber, whatsAppLink } from "@/lib/whatsapp";

describe("números de WhatsApp (Paraguay)", () => {
  it("normaliza los formatos comunes a 595…", () => {
    expect(toWhatsAppNumber("0981 123 456")).toBe("595981123456");
    expect(toWhatsAppNumber("+595 981 123456")).toBe("595981123456");
    expect(toWhatsAppNumber("981123456")).toBe("595981123456");
    expect(toWhatsAppNumber("00595981123456")).toBe("595981123456");
  });

  it("descarta lo que no es un celular", () => {
    expect(toWhatsAppNumber("123")).toBeNull();
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
  });

  it("arma el link con el mensaje codificado", () => {
    expect(whatsAppLink("0981 123 456", "Hola Ana, ¿todo bien?")).toBe(
      "https://wa.me/595981123456?text=Hola%20Ana%2C%20%C2%BFtodo%20bien%3F",
    );
    expect(whatsAppLink(null, "x")).toBeNull();
  });
});

describe("mensajes listos", () => {
  const base = { clientName: "Ana Benítez", serviceName: "Corte", time: "10:30", businessName: "Barbería", today: "2026-11-22" };

  it("hoy / mañana / el lunes 30", () => {
    expect(relativeDay("2026-11-22", "2026-11-22")).toBe("hoy");
    expect(relativeDay("2026-11-23", "2026-11-22")).toBe("mañana");
    expect(relativeDay("2026-11-30", "2026-11-22")).toBe("el lunes 30");
  });

  it("confirmación con el primer nombre", () => {
    expect(messages.confirmation({ ...base, date: "2026-11-23" })).toBe(
      "Hola Ana, te confirmo tu turno de Corte mañana a las 10:30 en Barbería. ¡Te esperamos!",
    );
  });

  it("al / del con 'el lunes'", () => {
    expect(messages.rescheduled({ ...base, date: "2026-11-30" })).toContain("pasó al lunes 30 a las 10:30");
    expect(messages.cancelled({ ...base, date: "2026-11-30" })).toContain("de Corte del lunes 30 a las 10:30");
    expect(messages.rescheduled({ ...base, date: "2026-11-23" })).toContain("pasó a mañana");
  });
});

describe("formatos", () => {
  it("guaraníes con punto de miles", () => {
    expect(formatThousands(1500000)).toBe("1.500.000");
    expect(formatPYG(150000)).toBe("₲ 150.000");
    expect(formatPYG(0)).toBe("₲ 0");
  });

  it("montos compactos para gráficos", () => {
    expect(formatPYGCompact(350000)).toBe("₲ 350 mil");
    expect(formatPYGCompact(1250000)).toBe("₲ 1,3 M");
    expect(formatPYGCompact(800)).toBe("₲ 800");
  });

  it("duraciones", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});
