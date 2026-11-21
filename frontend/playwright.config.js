import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  testMatch: '*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  outputDir: '../Artifacts/VaultAccessUI/test-results',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5190', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5190 --strictPort', url: 'http://127.0.0.1:5190/tests/ui/vault.html', reuseExistingServer: false },
});
