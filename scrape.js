import { chromium } from 'playwright';
import fs from 'fs/promises';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// Launch the local Microsoft Edge engine already installed on Windows
const browser = await chromium.launch({
  headless: false,  // Set to true if you don't want the window to pop up
  slowMo: 50,       // Slows down actions by 50ms so you can watch what happens
  channel: 'msedge' // Or 'chrome' if you prefer Google Chrome
});

const page = await browser.newPage();

console.log('Navigating to Chollometro...');
await page.goto('https://www.chollometro.com/categorias/videojuegos?sortBy=new');

// No cookies please (button element with data-t="cookie-banner")
const rejectCookies = page.locator('button[data-t="rejectAll"]');

try {
  // Cookies pop up takes a bit to show up
  await rejectCookies.waitFor({
    state: 'visible',
    timeout: 5_000
  });

  await rejectCookies.click({ timeout: 5_000 });
  console.log('Cookies rejected.');
} catch (error) {
  if (!await rejectCookies.count()) {
    console.log('Cookie banner did not appear.');
  } else {
    throw error;
  }
}

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

// 3. Print chollos
console.log('Here are the chollos found:');
chollos.forEach((chollo, index) => {
  console.log(`${index + 1}. ${chollo.title} - ${chollo.price} - ${chollo.age}`);
});

// get user response from stdin

const rl = readline.createInterface({ input, output });

let clickedChollo;

const cholloIndex = await rl.question('Enter the number of the chollo you want to click: ');
const cholloIndexInt = parseInt(cholloIndex, 10) - 1;

if (cholloIndexInt >= 0 && cholloIndexInt < chollos.length) {
  console.log(`You selected chollo ${cholloIndexInt + 1}: ${chollos[cholloIndexInt].title}`);
  clickedChollo = cholloCards.nth(cholloIndexInt);
} else {
  console.log('Invalid selection.');
}
rl.close();

if (clickedChollo) {
  // Click on the selected chollo
  console.log(`Clicking on chollo: ${clickedChollo}`);
  const clickable = clickedChollo.locator('a.thread-link');
  console.log('Matching links:', await clickable.count());
  console.log('Clicking the link...');
  console.log(clickable);
  await clickable.click();
  const description = await page.locator('[data-t="description"]').textContent();
  console.log(`Description: ${description}`);
}

// Clean up
await browser.close();
console.log('Browser closed. Done!');