import { test, chromium } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test('Homepage performance audit', async () => {
  test.setTimeout(180000); // 180 seconds
  // 1. Launch Chrome and open the debugging port
  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9222'],
  });
  
  const page = await browser.newPage();
  
  // Navigate to the local dev server
  // We assume the server is running on localhost:3000
  await page.goto('http://localhost:3000');

  // 2. Hand the page over to Lighthouse
  await playAudit({
    page: page,
    port: 9222,
    thresholds: {
      performance: 50, // Setting low initially to ensure it passes for reporting
      accessibility: 80,
      'best-practices': 80,
      seo: 80,
    },
    reports: {
      formats: { html: true, json: true },
      name: `homepage-audit-${new Date().toISOString().split('T')[0]}`,
      directory: `./lighthouse-reports`
    }
  });

  await browser.close();
});
