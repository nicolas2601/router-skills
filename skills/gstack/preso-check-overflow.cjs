const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8767/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  for (let n = 1; n <= 14; n++) {
    if (n > 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); }
    const info = await page.evaluate(() => {
      const slide = document.querySelector('.slide.active');
      const inner = slide.querySelector('.slide-inner');
      const body = slide.querySelector('.s-body') || inner;
      const rect = inner.getBoundingClientRect();
      return {
        bodyScroll: body.scrollHeight,
        bodyClient: body.clientHeight,
        overflow: body.scrollHeight > body.clientHeight + 2,
        slideH: window.innerHeight,
        innerH: rect.height
      };
    });
    console.log(`slide ${String(n).padStart(2,'0')}: overflow=${info.overflow} body=${info.bodyClient} scroll=${info.bodyScroll}`);
  }
  await browser.close();
})();
