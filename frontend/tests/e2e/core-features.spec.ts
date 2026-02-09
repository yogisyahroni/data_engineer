import { test, expect } from '@playwright/test';

test.describe.skip('InsightEngine AI - Industrial BI Smoke Test', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to homepage
        await page.goto('/');
        // Wait for the app to be ready
        await expect(page.getByTestId('active-db-indicator')).toBeVisible({ timeout: 10000 });
    });

    test('should allow switching between AI Prompt and SQL Editor', async ({ page }) => {
        // 1. Check if AI Prompt is default
        await expect(page.getByTestId('ai-prompt-input')).toBeVisible();

        // 2. Switch to SQL Editor
        await page.getByTestId('tab-sql').click();
        await expect(page.getByTestId('sql-editor-textarea')).toBeVisible();

        // 3. Switch back to AI Prompt
        await page.getByTestId('tab-ai').click();
        await expect(page.getByTestId('ai-prompt-input')).toBeVisible();
    });

    test('should execute a standard SQL query and display results', async ({ page }) => {
        // 1. Go to SQL Editor
        await page.getByTestId('tab-sql').click();

        // 2. Enter a query (default value should be there)
        const textarea = page.getByTestId('sql-editor-textarea');
        await textarea.fill('SELECT 1 as test_col');

        // 3. Run Query
        await page.getByTestId('run-query-button').click();

        // 4. Verify table results appear
        await expect(page.getByTestId('results-table-body')).toBeVisible();
        await expect(page.getByTestId('column-head-test_col')).toBeVisible();
        await expect(page.getByTestId('result-row-0')).toContainText('1');
    });

    test('should support AI prompt generation flow', async ({ page }) => {
        // 1. Enter prompt
        await page.getByTestId('ai-prompt-input').fill('Show me all orders');

        // 2. Click Generate (Note: This might call the real AI backend depending on config)
        // For this test, we verify the button is clickable and triggers a loading state
        await page.getByTestId('ai-generate-button').click();

        // 3. Wait for generated SQL preview or error (since we might not have keys set)
        // We check for either the success preview or the specific industrial error message
        const resultPreview = page.getByTestId('ai-result-preview');
        const isVisible = await resultPreview.isVisible({ timeout: 15000 }).catch(() => false);

        if (isVisible) {
            await expect(resultPreview).toContainText('SELECT');
        } else {
            // If no API Key, expect clear production error message
            await expect(page.locator('text=AI Error')).toBeVisible();
        }
    });

    test('should toggle schema browser', async ({ page }) => {
        // 1. Click Schema button
        await page.getByTestId('toggle-schema-browser').click();

        // 2. Verify Schema browser sidebar is visible
        await expect(page.locator('h3:has-text("Schema")')).toBeVisible();

        // 3. Check for mock tables
        await expect(page.locator('text=customers')).toBeVisible();
        await expect(page.locator('text=orders')).toBeVisible();
    });

    test('should allow searching and filtering query results', async ({ page }) => {
        // 1. Run a query to get multiple rows
        await page.getByTestId('tab-sql').click();
        await page.getByTestId('sql-editor-textarea').fill('SELECT * FROM orders'); // Using mock or real depending on env
        await page.getByTestId('run-query-button').click();

        // 2. Search for a specific value
        // Assuming mock data has 'orders' table
        await page.getByTestId('search-results-input').fill('non-existent-value');
        await expect(page.locator('text=No Results')).toBeVisible();
    });
});
