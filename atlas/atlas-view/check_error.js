import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) console.log(`RESPONSE ERROR: ${response.status()} ${response.url()}`);
  });
  
  await page.goto('http://localhost:5173/web/', { waitUntil: 'networkidle0' }).catch(e => console.log("GOTO ERROR:", e));
  
  await browser.close();
})();
