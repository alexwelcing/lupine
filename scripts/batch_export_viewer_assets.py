import asyncio
import os
import time
from playwright.async_api import async_playwright

async def export_molecule(page, name, download_dir):
    print(f"Exporting: {name}")
    try:
        time.sleep(4) # generic wait for initialization
        time.sleep(2)
        
        # Click the gallery open button
        gallery_btn = page.locator("button:has-text('Gallery')")
        if await gallery_btn.count() > 0:
            await gallery_btn.first.click()
            time.sleep(1)
        
        # Click the specific molecule
        mol_btn = page.locator(f"text='{name}'")
        if await mol_btn.count() > 0:
            await mol_btn.first.click()
            print("  -> Set molecule")
        time.sleep(6) # Wait for massive parsing to complete
        
        # Open Effects
        rend_btn = page.locator("button[aria-label='Rendering'], button[title='Rendering'], button:has-text('Effects')")
        if await rend_btn.count() > 0:
            await rend_btn.first.click()
            print("  -> Opened Rendering")
            time.sleep(1)
        
        # Turn on Bloom if available
        bloom_checkbox = page.locator("label:has-text('Bloom') input[type='checkbox']")
        if await bloom_checkbox.count() > 0 and not await bloom_checkbox.first.is_checked():
            await bloom_checkbox.first.click()
            print("  -> Enabled Bloom")
        time.sleep(1)
        
        # Click the Export ToolButton in the floating toolbar
        toolbar_export_btn = page.locator("div[style*='pointer-events: auto'] button:has-text('Export')")
        if await toolbar_export_btn.count() > 0:
            await toolbar_export_btn.first.click()
            print("  -> Opened Export Panel")
            time.sleep(1)
            
        export_form_btn = page.locator("button:has-text('Export Figure')")
            
        print(f"  -> Click export: {await export_form_btn.count()} buttons found")
        # Trigger Download
        async with page.expect_download(timeout=30000) as download_info:
            await export_form_btn.first.click()
        
        download = await download_info.value
        path = os.path.join(download_dir, f"{name.replace(' ', '_').lower()}.png")
        await download.save_as(path)
        print(f"  -> Saved {path}")
        
    except Exception as e:
        print(f"  -> Failed: {e}")

async def main():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dir = os.path.join(BASE_DIR, "lupine-site", "public", "generated-exports")
    os.makedirs(target_dir, exist_ok=True)
    
    molecules = ["Sapphire", "Cu Void Growth", "Li-S Cathode", "Al Polycrystal"]
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True, viewport={"width": 1920, "height": 1080}, device_scale_factor=2)
        page = await context.new_page()
        
        await page.goto("http://localhost:3000/")
        time.sleep(5) # initial wait
        
        # Hide UI components if needed (Optional)
        
        for mol in molecules:
            await export_molecule(page, mol, target_dir)
            await page.reload()
            time.sleep(4)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
