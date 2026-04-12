/**
 * Playwright loads `frontend/.env.e2e` for `E2E_USER_*` (test runner process only).
 * The Vite dev server uses `frontend/.env` — set `NEXT_PUBLIC_API_URL` there so login hits your API.
 *
 * Scripts: `pnpm run e2e` = smoke + critical (no auth-flow; stays green without creds).
 * `pnpm run e2e:auth` = full authenticated journey. `PLAYWRIGHT_BASE_URL` = skip local webServer for live smoke. See TESTING.md.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.e2e") });

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:1201";
const useDeployedTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: useDeployedTarget
    ? undefined
    : {
      command: "pnpm run dev",
      url: "http://127.0.0.1:1201",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
});
