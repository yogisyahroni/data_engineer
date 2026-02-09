import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

    test('should allow user to login and logout', async ({ page }) => {
        // Debug: Log browser console messages
        page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.log(`[Browser Error]: ${err.message}`));

        // 1. Navigate to Login Page (Correct Path)
        await page.goto('/auth/signin');

        // Check if we are really on login page
        await expect(page).toHaveURL(/.*\/auth\/signin/);

        // 2. Fill Credentials (using seeded demo account)
        // Using ID selectors from the page source
        await page.fill('#email', 'demo@spectra.id');
        await page.fill('#password', 'password123');

        // 3. Click Sign In
        // button type="submit" with text "Sign In"
        // await page.getByRole('button', { name: 'Sign In' }).click();
        const submitBtn = page.locator('button[type="submit"]');
        await expect(submitBtn).toBeVisible();
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // 4. Verify Redirect to Dashboard
        // Default callback is /dashboards when navigating directly to signin
        await expect(page).toHaveURL(/.*\/dashboards/, { timeout: 15000 });

        // Verify Dashboard element exists (Sidebar)
        await expect(page.locator('aside')).toBeVisible();

        // 5. Test Logout
        const logoutBtn = page.getByText('Logout');
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // 6. Verify Redirect back to Login
        await expect(page).toHaveURL(/.*\/auth\/signin/, { timeout: 10000 });
    });

    test('should redirect unauthenticated access to login', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/');
        // Should be redirected to /auth/signin
        await expect(page).toHaveURL(/.*\/auth\/signin/);
    });

});
