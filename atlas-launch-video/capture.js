const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: path.join(__dirname, 'assets'),
      size: { width: 1920, height: 1080 }
    }
  });

  // 1. Capture Drag & Drop Demo
  console.log('Capturing Drag & Drop...');
  const page1 = await context.newPage();
  await page1.goto('http://localhost:3000');
  await page1.waitForLoadState('networkidle');
  // Wait a bit to show the landing page
  await page1.waitForTimeout(1000);
  // Click "Try a demo" - we assume there's a button with this text
  const demoBtn = await page1.getByText('Try a demo', { exact: false });
  if (await demoBtn.count() > 0) {
    await demoBtn.first().click();
    // Wait for the 3D viewer to render
    await page1.waitForTimeout(5000);
  } else {
    console.log('Could not find Try a demo button');
    await page1.waitForTimeout(5000); // just wait
  }
  const videoPath1 = await page1.video().path();
  await page1.close();
  fs.renameSync(videoPath1, path.join(__dirname, 'assets', 'drag-drop-recording.webm'));

  // 2. Capture Gallery Tour
  console.log('Capturing Gallery...');
  const page2 = await context.newPage();
  await page2.goto('http://localhost:3000');
  await page2.waitForLoadState('networkidle');
  await page2.waitForTimeout(1000);
  // Try to scroll and click a gallery item
  // Usually gallery items have a specific role or class. Let's look for "Metals & Alloys"
  const galleryItem = await page2.getByText('Cantor Alloy Dislocation Glide', { exact: false });
  if (await galleryItem.count() > 0) {
    await galleryItem.first().click();
    await page2.waitForTimeout(5000);
  } else {
    // try to just click any text that might be a card
    const altCard = await page2.getByText('Atoms', { exact: false });
    if (await altCard.count() > 0) {
      await altCard.first().click();
      await page2.waitForTimeout(5000);
    } else {
      console.log('Could not find gallery item');
      await page2.waitForTimeout(5000);
    }
  }
  const videoPath2 = await page2.video().path();
  await page2.close();
  fs.renameSync(videoPath2, path.join(__dirname, 'assets', 'gallery-recording.webm'));

  // 3. Capture Publication Export
  console.log('Capturing Export...');
  const page3 = await context.newPage();
  await page3.goto('http://localhost:3000');
  await page3.waitForLoadState('networkidle');
  // Load demo first
  const demoBtn3 = await page3.getByText('Try a demo', { exact: false });
  if (await demoBtn3.count() > 0) {
    await demoBtn3.first().click();
    await page3.waitForTimeout(3000);
  }
  // Now click export
  const exportBtn = await page3.getByText('Export', { exact: false });
  if (await exportBtn.count() > 0) {
    await exportBtn.first().click();
    await page3.waitForTimeout(5000);
  } else {
    console.log('Could not find Export button');
    await page3.waitForTimeout(5000);
  }
  const videoPath3 = await page3.video().path();
  await page3.close();
  fs.renameSync(videoPath3, path.join(__dirname, 'assets', 'export-recording.webm'));

  await context.close();
  await browser.close();
  console.log('Capture complete!');
})();
