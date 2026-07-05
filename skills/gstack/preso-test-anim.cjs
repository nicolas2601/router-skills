const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // Test: direct navigate to slide 7 by URL hash trick or just slow scroll
  await page.goto('http://localhost:8767/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  // Press End to go to last, then Home to come back, then forward to slide 7
  for (let i = 1; i < 7; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(2000);
  // Check DOM
  const titles = await page.evaluate(() => {
    const active = document.querySelector('.slide.active');
    const all = document.querySelectorAll('.slide');
    const states = [];
    all.forEach((s, i) => {
      const t = s.querySelector('.title');
      const r = t ? t.getBoundingClientRect() : null;
      const cs = window.getComputedStyle(s);
      states.push({
        slide: i+1, active: s.classList.contains('active'),
        display: cs.display, opacity: cs.opacity,
        titleText: t ? t.textContent.trim().slice(0,40) : null,
        titleY: r ? r.top : null
      });
    });
    return states;
  });
  console.log(JSON.stringify(titles, null, 2));
  await page.screenshot({ path: '/tmp/preso-shots/final-07.png' });
  await browser.close();
})();
