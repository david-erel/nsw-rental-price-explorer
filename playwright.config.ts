import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173/nsw-rental-price-explorer/",
    headless: true,
    launchOptions: {
      slowMo: parseInt(process.env.SLOW_MO || "0"),
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173/nsw-rental-price-explorer/",
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
