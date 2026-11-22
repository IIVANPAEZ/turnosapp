import { expect, test } from "@playwright/test";
import { createBusiness, must, nowMinutesPY, previousWeekday, todayPY, useSession } from "./support";

test.describe("agenda: iniciar y finalizar con el cobro", () => {
  test("finalizar desde el detalle → ¿Cómo te pagó? → efectivo con descuento", async ({ page, context, baseURL }) => {
    const b = await createBusiness("cobro");
    const client = must(
      await b.owner.client.from("clients").insert({ business_id: b.businessId, full_name: "Ana Benítez", phone: "0981 111 222" }).select("id").single(),
      "cliente",
    );
    const day = previousWeekday();
    const apptId = must(
      await b.owner.client.rpc("create_appointment", { p_member_id: b.memberId, p_client_id: client.id, p_service_id: b.services.corte, p_date: day, p_time: "09:00" }),
      "turno",
    );
    await useSession(context, b.owner, baseURL!);

    await page.goto(`/dashboard/agenda?fecha=${day}&vista=dia`);
    await page.locator('[role="button"][title*="Ana Benítez"]').click();
    await page.getByRole("button", { name: "Finalizar cita" }).click();
    await expect(page.getByText("¿Cómo te pagó?")).toBeVisible();
    const amount = page.getByLabel("Monto cobrado");
    await expect(amount).toHaveValue("60.000");
    await amount.fill("55000");
    await page.getByRole("button", { name: "Efectivo" }).click();
    await expect(page.getByText("Turno finalizado · cobrado ₲ 55.000 · efectivo.")).toBeVisible();

    const a = must(await b.owner.client.from("appointments").select("status, payments(amount, method, voided_at)").eq("id", apptId).single(), "turno");
    expect(a.status).toBe("completed");
    expect(a.payments).toEqual([{ amount: 55000, method: "cash", voided_at: null }]);

    // Anular el cobro y registrarlo de nuevo (transferencia o tarjeta)
    await page.goto(`/dashboard/agenda?fecha=${day}&vista=dia`);
    await page.locator('[role="button"][title*="Ana Benítez"]').click();
    const sheet = page.locator('[data-slot="sheet-content"]:visible');
    await expect(sheet.getByText("Cobrado ₲ 55.000 · Efectivo")).toBeVisible();
    await sheet.getByRole("button", { name: "Anular cobro" }).click();
    await sheet.getByRole("button", { name: "Sí, anular" }).click();
    await expect(sheet.getByText("Sin cobrar")).toBeVisible();
    await sheet.getByRole("button", { name: "Registrar cobro" }).click();
    await sheet.getByRole("button", { name: /Transferencia o tarjeta/ }).click();
    await expect(sheet.getByText("Cobrado ₲ 60.000 · Transferencia o tarjeta")).toBeVisible();
  });

  test("Inicio: Iniciar cita → En curso → Finalizar → transferencia", async ({ page, context, baseURL }) => {
    const now = nowMinutesPY();
    test.skip(now < 60 || now > 22 * 60, "Necesita un turno de hoy a 30 minutos (no entra cerca de la medianoche).");
    const b = await createBusiness("iniciar");
    const client = must(
      await b.owner.client.from("clients").insert({ business_id: b.businessId, full_name: "Carla Duarte", phone: "0981 222 333" }).select("id").single(),
      "cliente",
    );
    const t = Math.round((now + 30) / 5) * 5;
    const time = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    const apptId = must(
      await b.owner.client.rpc("create_appointment", { p_member_id: b.memberId, p_client_id: client.id, p_service_id: b.services.barba, p_date: todayPY(), p_time: time }),
      "turno",
    );
    await useSession(context, b.owner, baseURL!);

    await page.goto("/dashboard");
    await page.getByRole("tab", { name: /Próximos/ }).click();
    const row = page.locator("li", { hasText: "Carla Duarte" });
    await row.getByRole("button", { name: "Iniciar cita" }).click();
    await expect(page.getByText("Turno iniciado.")).toBeVisible();
    await page.getByRole("tab", { name: /En curso/ }).click();
    await page.locator("li", { hasText: "Carla Duarte" }).getByRole("button", { name: "Finalizar cita" }).click();
    await page.getByRole("button", { name: /Transferencia o tarjeta/ }).click();
    await expect(page.getByText(/Turno finalizado · cobrado ₲ 40.000/)).toBeVisible();

    const a = must(await b.owner.client.from("appointments").select("status, started_at, payments(method)").eq("id", apptId).single(), "turno");
    expect(a.status).toBe("completed");
    expect(a.started_at).not.toBeNull();
    expect(a.payments[0]?.method).toBe("transfer");
  });
});
