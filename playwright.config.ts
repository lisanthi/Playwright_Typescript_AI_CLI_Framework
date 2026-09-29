import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 30 * 1000,     // 30000 ms (30 secs)
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],                                      // Detailed console output
    // ['line'],                                   // One-line progress output
    // ['dot'],                                    // Minimal console output
    ['html', { open: 'never', outputFolder: 'reports' }],       // HTML Report
    // ['json', { outputFile: 'reports/results.json' }],        // JSON Report
    // ['junit', { outputFile: 'reports/results.xml' }],       // JUnit XML Report
    ['./utils/CustomReporter.ts'],                // Custom reporter
    ['allure-playwright', { outputFolder: 'allure-results' }] // Allure Report
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false,
    viewport: { width: 1280, height: 720 }, // Set default viewport size for consistency
    ignoreHTTPSErrors: true, // Ignore SSL errors if necessary
    permissions: ['geolocation'], // Set necessary permissions for geolocation-based tests
    extraHTTPHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  },
  grep: /@master/,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],
});
