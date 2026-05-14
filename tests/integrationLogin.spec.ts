/* Test case 3: Login integration
 * The goal is to verify that the system is working flawlessly
 * by integrating properly the communication between frontend and backend. 
*/

import { test, expect } from '@playwright/test';

test.describe('Integración de login', () => {

  test('login exitoso redirige al dashboard y setea token', async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await page.goto('https://localhost:4321/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', '123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Validate redirect
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Validate cookies 
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'token');
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value).toBeTruthy();
    expect(tokenCookie?.httpOnly).toBe(true); 
  });

  test('credenciales inválidas no redirigen', async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await page.goto('https://localhost:4321/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrong_password');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Login must not appear
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Validate cookies 
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'token');
    expect(tokenCookie).toBeUndefined();
  });

});

// To run it individually: npx playwright test integrationLogin.spec.ts
// Important: App must be running on both backend and frontend