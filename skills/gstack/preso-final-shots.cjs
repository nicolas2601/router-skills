const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (let n = 1; n <= 14; n++) {
    await page.goto('http://localhost:8767/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    for (let i = 1; i < n; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); }
    await page.waitForTimeout(450);
    await page.screenshot({ path: `/tmp/preso-shots/final-${String(n).padStart(2,'0')}.png` });
  }
  await browser.close();
})();
