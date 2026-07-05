const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const targets = [4, 11, 12, 14];
  for (const n of targets) {
    await page.goto('http://localhost:8767/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    for (let i = 1; i < n; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(220); }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/preso-shots/slide-${String(n).padStart(2,'0')}.png` });
  }
  await browser.close();
})();
