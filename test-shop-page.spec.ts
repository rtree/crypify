import { test, expect } from '@playwright/test';

test.describe('Shop page comparison', () => {
  test('Check production shop page', async ({ page }) => {
    console.log('=== Testing Production ===');
    const response = await page.goto('https://crypify-web-kkz6k4jema-an.a.run.app/shop/index.html');
    console.log('Response status:', response?.status());
    console.log('Response URL:', response?.url());
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'production-shop.png', fullPage: true });
    
    // Get page content
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page content length:', content.length);
    console.log('First 500 chars:', content.substring(0, 500));
    
    // Check console errors
    page.on('console', msg => console.log('Console:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('Error:', err.message));
  });

  test('Check local shop page', async ({ page }) => {
    console.log('=== Testing Local ===');
    const response = await page.goto('http://localhost:3000/shop/index.html');
    console.log('Response status:', response?.status());
    console.log('Response URL:', response?.url());
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'local-shop.png', fullPage: true });
    
    // Get page content
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page content length:', content.length);
    console.log('First 500 chars:', content.substring(0, 500));
  });
});
