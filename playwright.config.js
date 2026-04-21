import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

config(); // load .env so TEST_* vars are available to fixtures

const E2E_PORT = process.env.E2E_PORT || '3001';
const BASE_URL  = process.env.E2E_BASE_URL || `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false, // sequential — share one server instance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 15000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  webServer: {
    command: `node tests/e2e/start-server.js`,
    url: `http://localhost:${E2E_PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: { SKIP_RATE_LIMIT: 'true', SKIP_CSRF: 'true' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
  },
});
