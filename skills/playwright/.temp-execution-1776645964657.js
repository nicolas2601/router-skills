const { chromium } = require('playwright');
const TARGET_URL = 'http://localhost:8766';

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    slowMo: 100 
  });
  
  const consoleErrors = [];
  const page = await browser.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    console.log('=== TEST 1: Page Load ===');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Title:', await page.title());
    
    console.log('\n=== TEST 2: Loader Verification ===');
    const loaderVisible = await page.isVisible('#loader');
    console.log('Loader visible initially:', loaderVisible);
    
    // Wait for loader to hide (frames loaded)
    await page.waitForFunction(() => {
      const loader = document.getElementById('loader');
      return loader && loader.classList.contains('hidden');
    }, { timeout: 30000 });
    console.log('Loader hid after frame preload: YES');
    
    console.log('\n=== TEST 3: Hero Screenshot ===');
    await page.screenshot({ path: '/tmp/qa-hero.png', fullPage: false });
    console.log('Screenshot saved: /tmp/qa-hero.png');
    
    console.log('\n=== TEST 4: Scroll Animation Test ===');
    // Scroll to trigger scroll animation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/qa-scrolled.png', fullPage: false });
    console.log('Screenshot after scroll saved: /tmp/qa-scrolled.png');
    
    console.log('\n=== TEST 5: Mobile Responsive (375px) ===');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => {
      const loader = document.getElementById('loader');
      return loader && loader.classList.contains('hidden');
    }, { timeout: 30000 });
    await page.screenshot({ path: '/tmp/qa-mobile.png', fullPage: false });
    console.log('Mobile screenshot saved: /tmp/qa-mobile.png');
    
    console.log('\n=== TEST 6: Sections Existence ===');
    const sections = ['nav', '.hero', '.kicker', '#scroll-section', '.features', '.cta', 'footer'];
    for (const sel of sections) {
      const exists = await page.locator(sel).count() > 0;
      console.log(`  ${sel}: ${exists ? '✅' : '❌'}`);
    }
    
    console.log('\n=== TEST 7: Canvas Element ===');
    const canvasExists = await page.locator('#frame-canvas').count() > 0;
    console.log('  #frame-canvas exists:', canvasExists ? '✅' : '❌');
    
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length === 0) {
      console.log('  No console errors detected ✅');
    } else {
      consoleErrors.forEach(e => console.log('  ❌ ERROR:', e));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();