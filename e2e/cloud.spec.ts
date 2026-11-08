import { expect, test } from '@playwright/test';

test('mostra a nuvem como indisponivel sem configuracao do Supabase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Nuvem' })).toBeVisible();
  await expect(page.getByText('Indisponível')).toBeVisible();
  await expect(page.getByText(/Configure as variáveis/)).toBeVisible();
});

test('area de nuvem nao cria rolagem horizontal em 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Nuvem' })).toBeVisible();
  const scrollWidth = await page.locator('html').evaluate((element: unknown) => {
    if (!element || typeof element !== 'object') return 0;
    const value = (element as { scrollWidth?: unknown }).scrollWidth;
    return typeof value === 'number' ? value : 0;
  });
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
