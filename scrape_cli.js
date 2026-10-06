import { firefox, chromium } from 'playwright';
import fs from 'fs/promises';

(async (chromium) => {
  // Launch visible Firefox instance
  let browser;
  browser = await chromium.launch({ headless: false, slowMo: 100 });
  if (!chromium) {
    browser = await firefox.launch({ headless: false, slowMo: 100 });
  }
  const page = await browser.newPage();

  if (chromium) {
    console.log('Navigating to catalog with Chromium...');
  } else {
    console.log('Navigating to catalog with Firefox...');
  }
  await page.goto('https://books.toscrape.com/');

  // Wait for article cards to render
  const bookElements = page.locator('article.product_pod');
  const count = await bookElements.count();

  const books = [];

  for (let i = 0; i < count; i++) {
    const item = bookElements.nth(i);
    const title = await item.locator('h3 a').getAttribute('title');
    const price = await item.locator('.price_color').textContent();
    const inStock = (await item.locator('.instock.availability').textContent()).includes('In stock');

    books.push({ title, price: price.trim(), inStock });
  }

  // Save parsed data to disk using fs
  await fs.writeFile('books.json', JSON.stringify(books, null, 2));
  console.log(`Saved ${books.length} items to books.json`);

  // Capture full page screenshot
  await page.screenshot({ path: 'catalog_firefox.png', fullPage: true });

  await browser.close();
})(true);