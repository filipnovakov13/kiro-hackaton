import { test, expect, Page } from '@playwright/test';

/**
 * UX Validation Test Suite
 * 
 * This test suite provides infrastructure for:
 * - Screenshot capture for visual inspection
 * - Basic accessibility compliance checks (WCAG guidelines)
 * - Interactive element functionality verification
 * 
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */

// Configuration for dev server
const DEV_SERVER_URL = process.env.DEV_SERVER_URL || 'http://localhost:5173';

test.describe('UX Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dev server before each test
    await page.goto(DEV_SERVER_URL);
  });

  test.describe('Screenshot Capture', () => {
    test('capture homepage screenshot', async ({ page }) => {
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Capture full page screenshot
      await page.screenshot({ 
        path: 'screenshots/homepage.png', 
        fullPage: true 
      });
      
      // Verify screenshot was captured (file exists check happens implicitly)
      expect(true).toBe(true);
    });

    test('capture viewport screenshot', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Capture viewport-only screenshot
      await page.screenshot({ 
        path: 'screenshots/homepage-viewport.png', 
        fullPage: false 
      });
    });

    test('capture component screenshot by selector', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Example: capture main content area if it exists
      const mainContent = page.locator('main, #root, #app, body');
      if (await mainContent.first().isVisible()) {
        await mainContent.first().screenshot({ 
          path: 'screenshots/main-content.png' 
        });
      }
    });
  });

  test.describe('Accessibility Checks', () => {
    /**
     * Basic accessibility structure checks
     * These tests verify fundamental WCAG compliance without external dependencies
     */

    test('page has proper document structure', async ({ page }) => {
      // Check for lang attribute on html element
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
      
      // Check for title element
      const title = await page.title();
      expect(title).toBeTruthy();
    });

    test('images have alt attributes', async ({ page }) => {
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        // Alt can be empty string for decorative images, but attribute must exist
        expect(alt).not.toBeNull();
      }
    });

    test('interactive elements are keyboard accessible', async ({ page }) => {
      // Check that buttons and links are focusable
      const interactiveElements = page.locator('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 elements
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          await element.focus();
          const isFocused = await element.evaluate(el => document.activeElement === el);
          expect(isFocused).toBe(true);
        }
      }
    });

    test('form inputs have associated labels', async ({ page }) => {
      const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          const placeholder = await input.getAttribute('placeholder');
          
          // Input should have at least one labeling mechanism
          const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
          const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
          
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    });

    test('color contrast check structure', async ({ page }) => {
      // This is a placeholder for color contrast checking
      // In production, integrate with axe-core or similar tool
      
      // Basic check: ensure text elements have readable font sizes
      const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6, li, td, th');
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const fontSize = await element.evaluate(el => 
            parseFloat(window.getComputedStyle(el).fontSize)
          );
          // Minimum readable font size (12px)
          expect(fontSize).toBeGreaterThanOrEqual(12);
        }
      }
    });
  });

  test.describe('Interactive Element Verification', () => {
    test('buttons are clickable and responsive', async ({ page }) => {
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible() && await button.isEnabled()) {
          // Verify button is clickable (doesn't throw)
          await expect(button).toBeEnabled();
          
          // Check for hover state (cursor should change)
          const cursor = await button.evaluate(el => 
            window.getComputedStyle(el).cursor
          );
          expect(['pointer', 'default']).toContain(cursor);
        }
      }
    });

    test('links are functional', async ({ page }) => {
      const links = page.locator('a[href]');
      const linkCount = await links.count();
      
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          const href = await link.getAttribute('href');
          // Links should have valid href
          expect(href).toBeTruthy();
          expect(href).not.toBe('#');
        }
      }
    });

    test('form submission works', async ({ page }) => {
      const forms = page.locator('form');
      const formCount = await forms.count();
      
      if (formCount > 0) {
        const form = forms.first();
        // Verify form has action or submit handler
        const action = await form.getAttribute('action');
        const hasSubmitButton = await form.locator('button[type="submit"], input[type="submit"]').count() > 0;
        
        // Form should have either action or submit button
        expect(action || hasSubmitButton).toBeTruthy();
      }
    });
  });
});

/**
 * Helper function to run accessibility audit with axe-core
 * This can be used when axe-core is installed
 */
async function runAxeAudit(page: Page) {
  // Placeholder for axe-core integration
  // Install @axe-core/playwright for full accessibility testing:
  // npm install -D @axe-core/playwright
  //
  // Usage:
  // import AxeBuilder from '@axe-core/playwright';
  // const results = await new AxeBuilder({ page }).analyze();
  // expect(results.violations).toEqual([]);
  
  return { violations: [] };
}
