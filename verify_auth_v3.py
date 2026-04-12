import asyncio
from playwright.async_api import async_playwright
import time
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        print("Starting auth flicker verification v3...")

        # We'll use a local storage injection to simulate onlyGoogleAuth = true
        # and then navigate to the auth page.
        await page.goto("http://localhost:8082/")
        await page.evaluate("localStorage.setItem('karbali_only_google_auth', 'true')")

        # Navigate to auth and start capturing
        await page.goto("http://localhost:8082/auth")

        # Capture frames for 1 second to look for flicker
        start_time = time.time()
        frames = []
        while time.time() - start_time < 1.0:
            # Check for standard form elements that should NOT be there
            has_login_tab = await page.query_selector("text=Login")
            has_email_input = await page.query_selector("label:has-text('Email')")

            if has_login_tab or has_email_input:
                print(f"FAILURE: Detected standard form elements at {time.time() - start_time:.3f}s")

            await asyncio.sleep(0.05)

        await page.screenshot(path="verification_v3.png")
        print("Verification v3 complete. Screenshot saved.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
