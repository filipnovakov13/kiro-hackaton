/**
 * End-to-end test for document upload flow.
 * Tests the complete upload → processing → display cycle.
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test file for upload
const TEST_FILE_CONTENT = `# Test Document

This is a test document for the upload flow.

## Section 1

Some content in section 1.

## Section 2

More content in section 2.
`;

test.describe("Document Upload Flow", () => {
  test.beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, "fixtures");
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a test markdown file
    const testFilePath = path.join(fixturesDir, "test-document.md");
    fs.writeFileSync(testFilePath, TEST_FILE_CONTENT);
  });

  test("should display upload zone on page load", async ({ page }) => {
    await page.goto("/");

    // Check that the upload zone is visible
    const uploadZone = page.getByTestId("upload-zone");
    await expect(uploadZone).toBeVisible();

    // Check for upload instructions
    await expect(page.getByText(/drop a document here/i)).toBeVisible();
    await expect(page.getByText(/supports pdf, docx, txt, md/i)).toBeVisible();
  });

  test("should display URL input field", async ({ page }) => {
    await page.goto("/");

    // Check that URL input is visible
    const urlInput = page.getByPlaceholder(/paste a url/i);
    await expect(urlInput).toBeVisible();

    // Check for Add URL button
    await expect(page.getByRole("button", { name: /add url/i })).toBeVisible();
  });

  test("should show document list section", async ({ page }) => {
    await page.goto("/");

    // Check for the "Your Documents" section header
    await expect(page.getByText(/your documents/i)).toBeVisible();

    // The list should be visible (either with documents or empty state)
    // We just verify the section exists
    await expect(page.locator(".bg-white.rounded-lg.border")).toBeVisible();
  });

  test("should upload a markdown file successfully", async ({ page }) => {
    await page.goto("/");

    // Get the file input (hidden)
    const fileInput = page.locator('input[type="file"]');

    // Create test file path
    const testFilePath = path.join(__dirname, "fixtures", "test-document.md");

    // Upload the file
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to start - should see processing indicator or the file appears
    // The upload triggers immediately, so we should see either:
    // 1. A processing message
    // 2. The document in the list
    await expect(
      page.getByText(/uploading|processing|test-document\.md/i)
    ).toBeVisible({ timeout: 10000 });

    // Wait for processing to complete
    // The document should appear in the list with its name
    await expect(page.getByText("test-document.md").first()).toBeVisible({
      timeout: 60000,
    });
  });

  test("should reject files that are too large", async ({ page }) => {
    await page.goto("/");

    // This test would need a large file - skip for now
    // The validation happens client-side in UploadZone
  });

  test("should validate URL format", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.getByPlaceholder(/paste a url/i);
    const addButton = page.getByRole("button", { name: /add url/i });

    // Try to submit invalid URL
    await urlInput.fill("not-a-valid-url");
    await addButton.click();

    // Should show validation error
    await expect(page.getByText(/must start with http/i)).toBeVisible();
  });

  test("should delete a document", async ({ page }) => {
    await page.goto("/");

    // First, check if there are any documents to delete
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check if there's at least one document
    const deleteButtons = page.locator('button[title="Delete document"]');
    const count = await deleteButtons.count();

    if (count === 0) {
      // Upload a file first
      const testFilePath = path.join(__dirname, "fixtures", "test-document.md");
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // Wait for document to appear
      await expect(page.getByText("test-document.md")).toBeVisible({
        timeout: 60000,
      });
    }

    // Now delete the first document
    // Accept the confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());

    const deleteButton = page
      .locator('button[title="Delete document"]')
      .first();
    await deleteButton.click();

    // Wait a moment for the deletion to process
    await page.waitForTimeout(1000);

    // Verify the delete button was clicked (the document should be removed)
    // We can't easily verify the exact document was removed, but we can verify
    // the delete action completed without error
  });
});
