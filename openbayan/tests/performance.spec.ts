import { test, chromium } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Performance Audits', () => {
  test('Homepage performance audit', async () => {
    test.setTimeout(180000); // 180 seconds
    // 1. Launch Chrome and open the debugging port
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    });
    
    const page = await browser.newPage();
    
    // Navigate to the local dev server
    await page.goto('http://localhost:3000');

    // 2. Hand the page over to Lighthouse
    await playAudit({
      page: page,
      port: 9222,
      thresholds: {
        performance: 50,
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

  test('Workspace performance audit', async () => {
    test.setTimeout(300000); // 300 seconds for workspace
    const browser = await chromium.launch({
      args: ['--remote-debugging-port=9222'],
    });
    
    const page = await browser.newPage();
    
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('#login-email', 'user@openbayan.org');
    await page.fill('#login-password', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**');
    
    // Navigate to workspace
    await page.goto('http://localhost:3000/workspace');
    await page.waitForLoadState('networkidle');

    // 2. Hand the page over to Lighthouse
    await playAudit({
      page: page,
      port: 9222,
      thresholds: {
        performance: 30, // Workspace is heavy CSR, set lower threshold for initial check
        accessibility: 70,
        'best-practices': 70,
        seo: 70,
      },
      reports: {
        formats: { html: true, json: true },
        name: `workspace-audit-${new Date().toISOString().split('T')[0]}`,
        directory: `./lighthouse-reports`
      }
    });

    await browser.close();
  });
});
