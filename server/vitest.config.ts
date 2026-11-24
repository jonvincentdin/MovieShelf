import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Expose server/.env (all keys, not just VITE_*) to tests; CI sets DATABASE_URL directly.
  test: { env: loadEnv("test", process.cwd(), ""), globalSetup: ["test/global-setup.ts"] },
});
