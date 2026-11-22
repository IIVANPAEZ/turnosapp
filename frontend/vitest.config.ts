import path from "node:path";
import { defineConfig } from "vitest/config";

// Pruebas rápidas de la lógica pura (sin servidor ni base): `npm test`.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Paraguay: UTC-3 todo el año (sin horario de verano desde 2024).
    env: { TZ: "UTC" },
  },
});
