import { expect, test } from "@playwright/test";
import { createBusiness, useSession } from "./support";

test("app instalable desde el login (manifiesto e íconos)", async ({ page, request }) => {
  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/app.webmanifest");
  const manifest = await (await request.get("/app.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "TurnoPy", start_url: "/dashboard", display: "standalone" });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  // Playwright abre el navegador en modo incógnito, donde Chrome nunca instala apps: se ignora solo ese motivo.
  expect(installabilityErrors.filter((e) => e.errorId !== "in-incognito")).toEqual([]);
});

test("link inexistente del panel → página 'No encontramos esta página'", async ({ page, context, baseURL }) => {
  // Sin sesión, cualquier dirección del panel manda al login (eso se prueba en registro.spec).
  const b = await createBusiness("noexiste");
  await useSession(context, b.owner, baseURL!);
  await page.goto("/dashboard/esto-no-existe");
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir a mi panel" })).toBeVisible();
});
