# Playwright + Lighthouse: The Performance Playbook

Lighthouse is great for checking how fast a page loads. Playwright is great for acting like a real user. Combine them, and you can test how your app performs *while* a user is interacting with it, not just when it first loads.

Here is how you set it up, run it, and scale it.

## 1. The Setup

First, grab the tools. You need Playwright, Lighthouse, and a bridge package that connects them.

```bash
npm install -D playwright @playwright/test lighthouse playwright-lighthouse
```

## 2. The Basic Script

Playwright normally hides what it's doing under the hood. To let Lighthouse see the performance data, you have to launch the Chromium browser with a specific "remote debugging port" open.

Here is the cleanest way to run a test:

```typescript
// performance.spec.ts
import { test, chromium } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test('Homepage performance audit', async () => {
  // 1. Launch Chrome and open the debugging port
  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9222'],
  });
  
  const page = await browser.newPage();
  await page.goto('https://your-heavy-nextjs-site.com');

  // 2. Hand the page over to Lighthouse
  await playAudit({
    page: page,
    port: 9222,
    thresholds: {
      performance: 80,
      accessibility: 90,
      seo: 80,
    },
    // This saves a clean HTML report you can view in your browser
    reports: {
      formats: { html: true },
      name: `homepage-audit`,
      directory: `./lighthouse-reports`
    }
  });

  await browser.close();
});
```

## 3. Seek Higher: The Pro Playbook

If you want to handle this like an enterprise team, a basic script won't cut it. Here is how the pros structure this.

### A. Testing Behind a Login

Lighthouse by itself can't log in to your app. Playwright can. The trick is to use Playwright to handle the auth flow, save the session, and *then* run the audit.

```typescript
// Log in first
await page.goto('https://app.com/login');
await page.fill('#email', 'pro@example.com');
await page.fill('#password', 'password123');
await page.click('button[type="submit"]');

// Wait for the heavy dashboard to load, THEN run the audit
await page.waitForSelector('.heavy-dashboard-element');

await playAudit({
  page: page,
  port: 9222,
  // ... thresholds and config
});
```

### B. CI/CD Pipeline Gates

Don't wait until production to find out a new component killed your frame rate. Wire this up in GitHub Actions or GitLab CI.

If a developer makes a Pull Request that drops the performance score below your strict thresholds (e.g., Performance < 80), the Playwright test fails, and the PR gets blocked automatically.

### C. Watch Out for Parallel Runs

If you run multiple Lighthouse audits at the exact same time on the exact same port (9222), they will crash.

If you set this up in a test suite running parallel workers, use a package like `get-port` to dynamically assign a unique port to each Playwright worker, rather than hardcoding 9222.
