import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './web-tests',
  fullyParallel: false,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] },
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', testMatch: ['**/pilot.spec.js', '**/carousel.spec.js', '**/cms.spec.js'], use: { browserName: 'chromium', viewport: { width: 1360, height: 960 } } },
    { name: 'mobile', testMatch: ['**/pilot.spec.js', '**/carousel.spec.js', '**/cms.spec.js'], use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'tablet', testMatch: ['**/cms.spec.js'], use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } },
    { name: 'standalone-desktop', metadata: { standalone: true }, use: { browserName: 'chromium', viewport: { width: 1360, height: 960 } } },
    { name: 'standalone-mobile', metadata: { standalone: true }, use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
