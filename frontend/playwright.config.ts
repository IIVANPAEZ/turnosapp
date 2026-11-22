import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta: `npm run test:e2e`.
 * - Usan el Chrome instalado en la compu (no descargan navegadores).
 * - Compilan y levantan la app en el puerto 3124 (no choca con `npm run dev` en el 3000).
 * - Usan el proyecto de Supabase real con usuarios e2e+pw-…@turnosapp-test.dev,
 *   que se borran al final (tests/e2e/global-teardown.ts). Necesitan la CLI de
 *   Supabase vinculada (`supabase link`), igual que para las migraciones.
 */
const PORT = 3124;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "es-PY",
    timezoneId: "America/Asuncion",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "computadora", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: /\.celular\.spec\.ts/ },
    { name: "celular", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /\.celular\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
