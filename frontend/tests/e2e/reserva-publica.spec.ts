import { expect, test } from "@playwright/test";
import { createBusiness, useSession } from "./support";

test("un cliente reserva desde la página pública y el negocio lo confirma", async ({ page, context, baseURL }) => {
  const b = await createBusiness("reserva");

  // Cliente sin sesión
  await page.goto(`/${b.slug}`);
  await expect(page.getByRole("heading", { name: "Barbería Don Ivan" })).toBeVisible();
  await page.getByRole("radio", { name: /Barba/ }).click();
  // Vista por semana: elige sola el primer día con lugar
  await expect(page.getByRole("button", { name: "Semana siguiente" })).toBeVisible();
  const slot = page.locator("#paso-horario button[aria-pressed]").first();
  await expect(slot).toBeVisible();
  const time = (await slot.innerText()).trim();
  await slot.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre y apellido").fill("Rosa Online");
  await page.getByLabel("Celular (WhatsApp)").fill("0985 777 888");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByText("¡Listo, tu turno está reservado!")).toBeVisible();
  await expect(page.getByText("Por confirmar")).toBeVisible();
  await expect(page.getByText(time).first()).toBeVisible();

  // El negocio la ve en Inicio y la confirma
  await useSession(context, b.owner, baseURL!);
  await page.goto("/dashboard");
  await expect(page.getByText("Tenés 1 reserva online por confirmar")).toBeVisible();
  await page.locator("li", { hasText: "Rosa Online" }).getByRole("button", { name: "Confirmar" }).click();
  await expect(page.locator("li", { hasText: "Rosa Online" }).getByText("Confirmado")).toBeVisible();
});

test("página pública: semanas con flechas, link inexistente y reservas pausadas", async ({ page }) => {
  const b = await createBusiness("semanas");
  await page.goto(`/${b.slug}`);
  await page.getByRole("radio", { name: /Corte/ }).click();
  const next = page.getByRole("button", { name: "Semana siguiente" });
  const title = next.locator("..");
  const before = await title.innerText();
  await next.click();
  await expect(title).not.toHaveText(before);
  await expect(page.getByRole("button", { name: "Semana anterior" })).toBeEnabled();

  await page.goto(`/pw-no-existe-${Date.now()}`);
  await expect(page.getByText("No encontramos esta página")).toBeVisible();

  await b.owner.client.from("businesses").update({ booking_enabled: false }).eq("id", b.businessId);
  await page.goto(`/${b.slug}`);
  await expect(page.getByText("Las reservas online están pausadas")).toBeVisible();
  // La página pública no ofrece instalar el panel
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});
