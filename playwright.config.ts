import { defineConfig } from "@playwright/test";

const startCommand =
  process.platform === "win32"
    ? "npm.cmd run start -- --port 3001"
    : "npm run start -- --port 3001";

export default defineConfig({
  expect: {
    timeout: 10_000
  },
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: startCommand,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3001"
  },
  projects: [
    {
      name: "chrome",
      use: {
        channel: "chrome",
        headless: false,
        viewport: {
          height: 1000,
          width: 1440
        }
      }
    }
  ]
});
