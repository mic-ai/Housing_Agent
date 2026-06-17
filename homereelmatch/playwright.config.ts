import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "/tmp/playwright-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "ja-JP",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: "postgresql://hrmuser:hrmpass@localhost:5432/homereelmatch",
      AUTH_SECRET: "test-secret-for-e2e-testing-only",
      NEXTAUTH_SECRET: "test-secret-for-e2e-testing-only",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      EMBED_ALLOWED_ORIGINS: "",
      RESEND_API_KEY: "re_dummy",
      FROM_EMAIL: "noreply@test.example.com",
      LINE_CHANNEL_SECRET: "dummy",
      LINE_CHANNEL_ACCESS_TOKEN: "dummy",
      NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy",
      SUPABASE_SERVICE_ROLE_KEY: "dummy",
    },
  },
});
