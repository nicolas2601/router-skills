const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const slides = [1, 2, 5, 8, 9, 10, 13, 14];
  for (const n of slides) {
    await page.goto('http://localhost:8767/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    // navigate via keyboard
    for (let i = 1; i < n; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(700);
    const out = `/tmp/preso-shots/slide-${String(n).padStart(2,'0')}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log('saved', out);
  }
  await browser.close();
})();
