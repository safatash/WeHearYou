import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'safa@wehearyou.app';
const USER_PASSWORD = 'demo1234';
const SCREENSHOT_DIR = '/tmp/rating-style-screenshots';

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.createContext();
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', USER_EMAIL);
    await page.fill('input[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/locations`, { timeout: 10000 });
    console.log('✅ Logged in successfully');

    // 2. Get a test location
    console.log('\n📍 Finding test location...');
    await page.goto(`${BASE_URL}/locations`);
    await page.waitForLoadState('networkidle');
    const firstLocation = await page.locator('button').filter({ has: page.locator('text=Nova Dental') }).first();
    const locationHref = await firstLocation.getAttribute('href');
    const locationId = locationHref?.split('/').pop();
    console.log(`✅ Found location: ${locationId}`);

    // Test each rating style
    const ratingStyles = [
      { name: 'Stars', value: 'stars', icon: '★' },
      { name: 'Faces', value: 'faces', icon: '😊' },
      { name: 'Thumbs', value: 'thumbs', icon: '👍' }
    ];

    for (const style of ratingStyles) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📸 Testing Rating Style: ${style.name}`);
      console.log(`${'═'.repeat(60)}`);

      // Update location appearance
      console.log(`  Setting appearance to ${style.name}...`);
      await page.goto(`${BASE_URL}/locations/${locationId}`);
      await page.waitForLoadState('networkidle');

      // Click on Appearance section
      await page.click('button', { hasText: 'Appearance' });
      await page.waitForLoadState('networkidle');

      // Select rating style
      const styleSelector = `button:has-text("${style.name}")`;
      await page.locator(styleSelector).first().click();
      await page.waitForTimeout(500);
      console.log(`  ✅ Set to ${style.name}`);

      // Get location slug
      const slug = await page.locator('text=/f\\//').first().textContent();
      const locationSlug = slug?.split('/').pop();
      console.log(`  Location slug: ${locationSlug}`);

      // 1. CAMPAIGN WIZARD PREVIEW
      console.log(`\n  1️⃣ Campaign Wizard Live Preview`);
      await page.goto(`${BASE_URL}/campaign-wizard`);
      await page.waitForLoadState('networkidle');

      // Select location
      await page.locator('button', { hasText: 'Nova Dental' }).first().click();
      await page.waitForTimeout(300);

      // Go to appearance step
      await page.locator('button:has-text("Appearance")').click();
      await page.waitForLoadState('networkidle');

      // Take screenshot
      const wizardScreenshot = `${SCREENSHOT_DIR}/${style.value}-1-wizard-preview.png`;
      await page.screenshot({ path: wizardScreenshot });
      console.log(`     📸 Screenshot: ${wizardScreenshot}`);

      // 2. PUBLIC FUNNEL PAGE /f/[slug]
      console.log(`\n  2️⃣ Public Funnel /f/${locationSlug}`);
      await page.goto(`${BASE_URL}/f/${locationSlug}`);
      await page.waitForLoadState('networkidle');

      const funnelScreenshot = `${SCREENSHOT_DIR}/${style.value}-2-funnel.png`;
      await page.screenshot({ path: funnelScreenshot });
      console.log(`     📸 Screenshot: ${funnelScreenshot}`);

      // Verify rating style is displayed
      const ratingElements = await page.locator('svg, [class*="text-5xl"], [class*="text-6xl"]').count();
      console.log(`     Rating elements found: ${ratingElements}`);

      // 3. DIRECT REVIEW LINK /review/[slug]
      console.log(`\n  3️⃣ Review Links /review/${locationSlug}`);
      await page.goto(`${BASE_URL}/review/${locationSlug}`);
      await page.waitForLoadState('networkidle');

      const reviewScreenshot = `${SCREENSHOT_DIR}/${style.value}-3-review-link.png`;
      await page.screenshot({ path: reviewScreenshot });
      console.log(`     📸 Screenshot: ${reviewScreenshot}`);

      // Verify the correct style is shown
      const pageText = await page.textContent('body');
      if (style.value === 'stars' && pageText.includes('Stars')) {
        console.log(`     ✅ Stars style verified`);
      } else if (style.value === 'faces' && pageText.includes('happy')) {
        console.log(`     ✅ Faces style verified`);
      } else if (style.value === 'thumbs' && pageText.includes('Thumbs')) {
        console.log(`     ✅ Thumbs style verified`);
      } else {
        console.log(`     ⚠️ Rating style not clearly visible in text`);
      }

      // 4. FUNNEL PREVIEW PAGE
      console.log(`\n  4️⃣ Funnel Preview Simulator`);
      await page.goto(`${BASE_URL}/funnel-preview?location=${locationId}`);
      await page.waitForLoadState('networkidle');

      const previewScreenshot = `${SCREENSHOT_DIR}/${style.value}-4-preview-simulator.png`;
      await page.screenshot({ path: previewScreenshot });
      console.log(`     📸 Screenshot: ${previewScreenshot}`);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ All tests completed!`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`${'═'.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

runTests();
