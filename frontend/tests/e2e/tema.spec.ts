import { expect, test, type Page } from "@playwright/test";
import { createBusiness, useSession } from "./support";

const theme = (page: Page) => page.evaluate(() => (document.documentElement.classList.contains("dark") ? "oscuro" : document.documentElement.classList.contains("light") ? "claro" : "ninguno"));
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const primary = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());

test("tema: automático sigue al sistema; Claro/Oscuro desde el menú se recuerdan", async ({ page, context, baseURL }) => {
  const b = await createBusiness("tema");
  await useSession(context, b.owner, baseURL!);

  // Automático (por defecto): sigue al sistema, y ya está aplicado antes de que cargue React (sin parpadeo).
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("claro");
  await page.waitForLoadState("load");
  expect(await bg(page)).toBe("rgb(245, 246, 248)");
  expect(await primary(page)).toBe("#2563eb"); // azul en el claro
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => theme(page)).toBe("oscuro");
  expect(await primary(page)).toBe("#f2a93b"); // ámbar en el oscuro

  // Elegir "Claro" con el sistema en oscuro → claro, y queda guardado al recargar.
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await page.getByRole("menuitemradio", { name: "Claro" }).click();
  await expect.poll(() => theme(page)).toBe("claro");
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("claro");

  // "Oscuro" con el sistema en claro.
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
  await expect.poll(() => theme(page)).toBe("oscuro");
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("oscuro");

  // Volver a "Automático".
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await page.getByRole("menuitemradio", { name: "Automático" }).click();
  await expect.poll(() => theme(page)).toBe("claro");
});

test("página pública: sigue el tema del dispositivo del cliente", async ({ page }) => {
  const b = await createBusiness("tema-publica");
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/${b.slug}`, { waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("claro");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/${b.slug}`, { waitUntil: "domcontentloaded" });
  expect(await theme(page)).toBe("oscuro");
});
