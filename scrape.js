import { chromium } from 'playwright';
import fs from 'fs/promises';

// Launch the local Microsoft Edge engine already installed on Windows
const browser = await chromium.launch({
  headless: false,  // Set to true if you don't want the window to pop up
  slowMo: 50,       // Slows down actions by 50ms so you can watch what happens
  channel: 'msedge' // Or 'chrome' if you prefer Google Chrome
});

const page = await browser.newPage();

console.log('Navigating to Books to Scrape...');
await page.goto('https://www.chollometro.com/categorias/videojuegos?sortBy=new');

// Locate all product cards
const cholloCards = page.locator('article.thread--deal');
const count = await cholloCards.count();
console.log(`Found ${count} chollos on the current page.`);

const chollos = [];

for (let i = 0; i < count; i++) {
  const card = cholloCards.nth(i);

  // Extract title, price, and in-stock status
  const title = await card.locator('a.js-thread-title').textContent();
  const age = await card.locator('.chip span.size--all-s').textContent();
  
  const priceLocator = card.locator('span.thread-price');
  const hasPrice = await priceLocator.isVisible({ timeout: 500 }).catch(() => false);

  const price = hasPrice 
    ? (await priceLocator.textContent()).trim() 
    : 'Free';
  
  chollos.push({
    title: title || 'Unknown Title',
    price: price ? price.trim() : 'Free',
    age: age ? age.trim() : 'N/A'
  });
}

// 1. Save data to a JSON file
await fs.writeFile('chollos.json', JSON.stringify(chollos, null, 2), 'utf-8');
console.log(`Successfully saved ${chollos.length} chollos to chollos.json`);

// 2. Capture a full-page screenshot
await page.screenshot({ path: 'catalog_chromium.png', fullPage: true });
console.log('Saved catalog_chromium.png');

// Clean up
await browser.close();
console.log('Browser closed. Done!');