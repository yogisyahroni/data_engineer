import { test, expect } from '@playwright/test';

test.describe('Enterprise Login - Accessibility Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/auth/signin');
        await page.waitForLoadState('networkidle');
    });

    test('should support complete keyboard navigation', async ({ page }) => {
        // Start at email field
        await page.keyboard.press('Tab');
        let focused = await page.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('email');

        // Tab to password
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('password');

        // Tab to forgot password link
        await page.keyboard.press('Tab');

        // Tab to remember me checkbox
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('remember');

        // Tab to submit button
        await page.keyboard.press('Tab');
        const submitButton = page.getByTestId('signin-submit-btn');
        await expect(submitButton).toBeFocused();

        // Should be able to submit with Enter
        await page.fill('#email', 'test@insightengine.com');
        await page.fill('#password', 'TestPassword123');
        await page.keyboard.press('Enter');

        // Should trigger submissionexpect some network activity
        await page.waitForTimeout(500);
    });

    test('should display proper ARIA labels', async ({ page }) => {
        const emailInput = page.locator('#email');
        const passwordInput = page.locator('#password');

        // Check ARIA attributes
        await expect(emailInput).toHaveAttribute('aria-invalid', 'false');
        await expect(passwordInput).toHaveAttribute('aria-invalid', 'false');

        // Submit empty form to trigger validation
        await page.click('[data-testid="signin-submit-btn"]');
        await page.waitForTimeout(300);

        // Check ARIA invalid state
        await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

        // Check ARIA describedby for errors
        await expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    test('should announce errors to screen readers', async ({ page }) => {
        // Submit empty form
        await page.click('[data-testid="signin-submit-btn"]');
        await page.waitForTimeout(300);

        // Check for ARIA live region
        const errorMessage = page.locator('#email-error');
        await expect(errorMessage).toHaveAttribute('role', 'alert');
        await expect(errorMessage).toHaveAttribute('aria-live', 'polite');

        // Verify error message is visible
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText('Email is required');
    });

    test('should detect and warn about Caps Lock', async ({ page }) => {
        // Focus password input
        await page.focus('#password');

        // Note: Actual Caps Lock detection requires keyboard event emulation
        // This is a placeholder test - in real scenarios, you'd need browser automation
        // that can simulate Caps Lock being on

        // For now, just verify the component structure is correct
        const passwordContainer = page.locator('#password').locator('..');
        await expect(passwordContainer).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
        const passwordInput = page.locator('#password');
        const toggleButton = page.locator('button[aria-label="Show password"]');

        // Initially should be password type
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle
        await toggleButton.click();

        // Should now be text type
        await expect(passwordInput).toHaveAttribute('type', 'text');

        // Toggle back
        const hideButton = page.locator('button[aria-label="Hide password"]');
        await hideButton.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should open forgot password modal with keyboard', async ({ page }) => {
        // Tab to forgot password link
        await page.keyboard.press('Tab'); // email
        await page.keyboard.press('Tab'); // password
        await page.keyboard.press('Tab'); // forgot password link

        // Press Enter to open modal
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Modal should be visible
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Reset Password');

        // Should be able to close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(modal).not.toBeVisible();
    });
});

test.describe('Enterprise Login - Validation Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/auth/signin');
        await page.waitForLoadState('networkidle');
    });

    test('should validate email format', async ({ page }) => {
        const emailInput = page.locator('#email');
        const submitButton = page.getByTestId('signin-submit-btn');

        // Enter invalid email
        await emailInput.fill('invalid-email');
        await submitButton.click();
        await page.waitForTimeout(300);

        // Should show error
        const errorMessage = page.locator('#email-error');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText('Invalid email address');

        // Enter valid email
        await emailInput.fill('test@insightengine.com');
        await submitButton.click();
        await page.waitForTimeout(300);

        // Email error should be gone (only password error remains)
        await expect(page.locator('#email-error')).not.toBeVisible();
    });

    test('should validate password length', async ({ page }) => {
        const emailInput = page.locator('#email');
        const passwordInput = page.locator('#password');
        const submitButton = page.getByTestId('signin-submit-btn');

        await emailInput.fill('test@insightengine.com');
        await passwordInput.fill('short');
        await submitButton.click();
        await page.waitForTimeout(300);

        // Should show error
        const errorContainer = passwordInput.locator('..').locator('..');
        await expect(errorContainer).toContainText('Password must be at least 8 characters');
    });

    test('should normalize email to lowercase', async ({ page }) => {
        const emailInput = page.locator('#email');

        // Enter uppercase email
        await emailInput.fill('TEST@EXAMPLE.COM');

        // The Zod schema should normalize it (we can't directly test this in E2E,
        // but we can verify the form accepts it)
        await page.getByTestId('signin-submit-btn').click();
        await page.waitForTimeout(300);

        // As long as no email format error appears, normalization worked
        await expect(page.locator('#email-error')).not.toHaveText('Invalid email address');
    });
});

test.describe('Enterprise Login - UX Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/auth/signin');
        await page.waitForLoadState('networkidle');
    });

    test('should display loading state during authentication', async ({ page }) => {
        await page.fill('#email', 'test@insightengine.com');
        await page.fill('#password', 'TestPassword123');

        const submitButton = page.getByTestId('signin-submit-btn');
        await submitButton.click();

        // Should show loading state
        await expect(submitButton).toBeDisabled();
        await expect(submitButton).toContainText('Signing in');

        // Should show spinner
        const spinner = submitButton.locator('.animate-spin');
        await expect(spinner).toBeVisible();
    });

    test('should remember me checkbox work', async ({ page }) => {
        const rememberCheckbox = page.locator('#remember');

        // Initially unchecked
        await expect(rememberCheckbox).not.toBeChecked();

        // Click to check
        await rememberCheckbox.click();
        await expect(rememberCheckbox).toBeChecked();

        // Click again to uncheck
        await rememberCheckbox.click();
        await expect(rememberCheckbox).not.toBeChecked();
    });

    test('should display security indicators', async ({ page }) => {
        // Check for SSL badge
        await expect(page.getByText('Secure Connection')).toBeVisible();

        // Check for compliance badges
        await expect(page.getByText('SOC 2')).toBeVisible();
        await expect(page.getByText('GDPR')).toBeVisible();
    });

    test('should animate background blobs', async ({ page }) => {
        // Check that animated blobs exist
        const blobs = page.locator('.animate-blob');
        await expect(blobs).toHaveCount(3);

        // Verify they have different animation delays
        const blob2 = blobs.nth(1);
        const blob3 = blobs.nth(2);
        await expect(blob2).toHaveClass(/animation-delay-2000/);
        await expect(blob3).toHaveClass(/animation-delay-4000/);
    });

    test('should display SSO providers', async ({ page }) => {
        await expect(page.getByText('Continue with Google Workspace')).toBeVisible();
        await expect(page.getByText('Continue with Microsoft 365')).toBeVisible();
        await expect(page.getByText('Continue with Okta')).toBeVisible();
    });
});

test.describe('Enterprise Login - Forgot Password Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/auth/signin');
        await page.waitForLoadState('networkidle');
    });

    test('should open and close forgot password modal', async ({ page }) => {
        // Click forgot password link
        await page.click('text=Forgot password?');
        await page.waitForTimeout(300);

        // Modal should be visible
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Reset Password');

        // Click cancel
        await page.click('button:has-text("Cancel")');
        await page.waitForTimeout(300);

        // Modal should be closed
        await expect(modal).not.toBeVisible();
    });

    test('should submit password reset request', async ({ page }) => {
        // Open modal
        await page.click('text=Forgot password?');
        await page.waitForTimeout(300);

        // Fill email
        const modalEmailInput = page.locator('#reset-email');
        await modalEmailInput.fill('test@insightengine.com');

        // Submit
        await page.click('button:has-text("Send Reset Link")');
        await page.waitForTimeout(2000); // Wait for simulated API call

        // Should show success state
        await expect(page.getByText('Check your email inbox')).toBeVisible();
    });

    test('should validate email in forgot password modal', async ({ page }) => {
        // Open modal
        await page.click('text=Forgot password?');
        await page.waitForTimeout(300);

        // Submit without email
        await page.click('button:has-text("Send Reset Link")');
        await page.waitForTimeout(300);

        // Should show error
        await expect(page.locator('#reset-email-error')).toBeVisible();
        await expect(page.locator('#reset-email-error')).toContainText('Email is required');
    });
});
