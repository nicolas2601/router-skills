const { chromium } = require('playwright');
const FRONTEND = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newContext({ viewport: { width: 1280, height: 800 } }).then(c => c.newPage());

  const email = `e2e-full-${Date.now()}@example.com`;
  await page.request.post('http://localhost:8080/api/v1/auth/register', {
    data: { email, password: 'password123' }
  });

  // Full login flow via form
  await page.goto(`${FRONTEND}/auth/login`);
  await page.waitForTimeout(500);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${FRONTEND}/`, { timeout: 10000 });
  console.log('Login OK, on dashboard');

  // Now /accounts via click
  await page.goto(`${FRONTEND}/accounts`);
  await page.waitForTimeout(2000);
  console.log('Accounts URL:', page.url());
  console.log('H1:', await page.locator('h1').first().textContent());
  await page.screenshot({ path: '/tmp/f2-1-accounts.png', fullPage: true });

  if (page.url().includes('/accounts')) {
    // Create account
    await page.click('button:has-text("Crear cuenta"):not(:has-text("cuenta"))');
    await page.waitForTimeout(1500);
    console.log('New account URL:', page.url());

    await page.fill('input[name="name"]', 'Bancolombia');
    await page.fill('input[name="currency"]', 'COP');
    await page.fill('input[name="opening_balance"]', '500000');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('After create URL:', page.url());
    await page.screenshot({ path: '/tmp/f2-2-with-account.png', fullPage: true });

    // Categories
    await page.goto(`${FRONTEND}/categories`);
    await page.waitForTimeout(2000);
    console.log('Categories URL:', page.url());
    await page.screenshot({ path: '/tmp/f2-3-categories.png', fullPage: true });

    // Seed
    await page.click('button:has-text("Cargar predeterminadas")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/f2-4-seeded.png', fullPage: true });
    const count = await page.locator('p.text-ink.font-medium').count();
    console.log('Categories count:', count);
  }

  await browser.close();
  console.log('OK - screenshots in /tmp/f2-*.png');
})().catch(e => { console.error('ERROR:', e); process.exit(1); });