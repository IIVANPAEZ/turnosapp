import { expect, test } from "@playwright/test";
import { e2eEmail, PASSWORD } from "./support";

test("registro → alta del negocio → panel con Primeros pasos", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill("Laura Giménez");
  await page.getByLabel("Email").fill(e2eEmail("registro"));
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Repetí la contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await page.waitForURL("**/onboarding");
  await page.getByLabel("Nombre del negocio").fill("Estudio Laura");
  await page.getByLabel("Dirección de tu página").fill(`pw-estudio-${Date.now()}`);
  await page.getByText("Belleza y estética").click();
  await expect(page.getByText("Disponible", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crear mi negocio" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Primeros pasos")).toBeVisible();
  await expect(page.getByText("Estudio Laura").first()).toBeVisible();
});

test("sin sesión, el panel manda al login", async ({ page }) => {
  await page.goto("/dashboard/agenda");
  await page.waitForURL("**/login**");
  await expect(page.getByRole("button", { name: /Ingresar|Entrar/ })).toBeVisible();
});
