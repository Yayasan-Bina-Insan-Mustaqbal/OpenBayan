const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/workspaces/openbayan/screenshot.png' });
  await browser.close();
  console.log('Screenshot saved to screenshot.png');
})();
