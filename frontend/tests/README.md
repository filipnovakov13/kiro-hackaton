# UX Validation Tests

This directory contains Playwright tests for UX validation, including screenshot capture and accessibility checks.

## Setup

Install the required dependencies:

```bash
cd frontend
npm install -D @playwright/test @types/node
npx playwright install
```

## Running Tests

Run all UX validation tests:

```bash
npx playwright test
```

Run tests with UI mode:

```bash
npx playwright test --ui
```

Run specific test file:

```bash
npx playwright test tests/ux-validation.spec.ts
```

## Screenshots

Screenshots are saved to the `frontend/screenshots/` directory during test execution.

## Configuration

The Playwright configuration is in `frontend/playwright.config.ts`. Key settings:

- **Dev Server**: Tests automatically start the Vite dev server on port 5173
- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Mobile**: Includes mobile viewport tests (Pixel 5, iPhone 12)
- **Screenshots**: Captured on test failure
- **Video**: Recorded on test failure

## Test Structure

- `ux-validation.spec.ts` - Main UX validation tests
  - Screenshot Capture - Visual inspection tests
  - Accessibility Checks - WCAG compliance verification
  - Interactive Element Verification - Button, link, and form tests

## Accessibility Testing

For comprehensive accessibility testing, install axe-core:

```bash
npm install -D @axe-core/playwright
```

Then uncomment the axe-core integration in the test file.
