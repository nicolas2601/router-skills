const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8767/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  for (let i = 1; i < 7; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(380); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/preso-shots/final-07.png' });
  await browser.close();
})();
