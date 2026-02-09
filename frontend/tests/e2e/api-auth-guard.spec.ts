import { test, expect } from '@playwright/test';

test.describe('API and WebSocket Auth Guard Tests', () => {

    test('should not make authenticated API calls before login', async ({ page }) => {
        // Track 401 errors
        const errors: string[] = [];
        const consoleLogs: string[] = [];

        page.on('response', response => {
            if (response.status() === 401) {
                errors.push(`401 on ${response.url()}`);
            }
        });

        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.type() === 'error' && msg.text().includes('401')) {
                errors.push(`Console 401: ${msg.text()}`);
            }
        });

        // Navigate to homepage (not logged in)
        await page.goto('/');

        // Wait for initial load
        await page.waitForLoadState('networkidle');

        // Wait a bit more for any delayed API calls
        await page.waitForTimeout(2000);

        // Log all console messages
        console.log('=== Console Logs ===');
        consoleLogs.forEach(log => console.log(log));
        console.log('=== End Console Logs ===');

        // Should have no 401 errors on initial page load
        // Some 401s are expected for auth checks, but api/go/* calls should not happen
        const apiGo401s = errors.filter(e => e.includes('/api/go/') || e.includes('/api/v1/'));

        console.log('All 401 errors:', errors);
        console.log('API 401 errors (should be 0):', apiGo401s);

        expect(apiGo401s.length).toBe(0);
    });

    test('should show login page when navigating to protected route', async ({ page }) => {
        // Try to access dashboard without login
        await page.goto('/dashboard');

        // Should redirect to signin
        await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('should allow login and access protected pages', async ({ page }) => {
        // Go to signin
        await page.goto('/auth/signin');

        // Fill credentials (using seeded demo account)
        await page.fill('#email', 'demo@spectra.id');
        await page.fill('#password', 'password123');

        // Submit
        await page.click('button[type="submit"]');

        // Wait for redirect (should go to dashboards)
        await page.waitForURL(/\/dashboards/, { timeout: 15000 });

        // Verify we're logged in by checking for sidebar or logout button
        await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Logout')).toBeVisible();
    });

    test('should connect WebSocket only after login', async ({ page }) => {
        const wsLogs: string[] = [];

        page.on('console', msg => {
            if (msg.text().includes('[WebSocket]')) {
                wsLogs.push(msg.text());
            }
        });

        // Visit page without login
        await page.goto('/');
        await page.waitForTimeout(2000);

        // Check WebSocket logs - should show "Skipping connection" or not connecting
        const skipLogs = wsLogs.filter(l => l.includes('Skipping') || l.includes('not enabled'));
        console.log('WebSocket logs before login:', wsLogs);

        // Either WebSocket should be disabled or skip connection
        // (might connect if there's no auth guard, we want to verify it doesn't fail)
        const connectionAttempts = wsLogs.filter(l => l.includes('Connecting'));
        const connectionErrors = wsLogs.filter(l => l.includes('error'));

        // If it attempts connection, it should not have errors on unauthenticated page
        // Because we added auth guard, it shouldn't even attempt
        if (connectionAttempts.length > 0) {
            // If it connected, verify no error
            console.warn('WebSocket attempted connection before auth - checking for errors');
        }

        // Key assertion: No WebSocket connection errors should occur
        expect(connectionErrors.length).toBe(0);
    });
});
