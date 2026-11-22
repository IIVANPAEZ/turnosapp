import { expect, test } from "@playwright/test";
import { createBusiness, useSession } from "./support";

test("celular: barra de abajo, 'Más' y sin scroll horizontal", async ({ page, context, baseURL }) => {
  const b = await createBusiness("celular");
  await useSession(context, b.owner, baseURL!);
  await page.goto("/dashboard");

  const nav = page.getByRole("navigation", { name: "Secciones" });
  await expect(nav).toBeVisible();
  for (const tab of ["Inicio", "Agenda", "Clientes", "Ingresos", "Más"]) await expect(nav.getByText(tab, { exact: true })).toBeVisible();

  await nav.getByRole("link", { name: "Agenda" }).click();
  await page.waitForURL("**/dashboard/agenda");
  await expect(nav.getByRole("link", { name: "Agenda" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("button", { name: "Más" }).click();
  const more = page.locator('[data-slot="sheet-content"]:visible');
  await more.getByRole("link", { name: "Servicios" }).click();
  await page.waitForURL("**/dashboard/servicios");

  for (const url of ["/dashboard", "/dashboard/agenda", "/dashboard/clientes", "/dashboard/ingresos", `/${b.slug}`]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `scroll horizontal en ${url}`).toBe(false);
  }
});
