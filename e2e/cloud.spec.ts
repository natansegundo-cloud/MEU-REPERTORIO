import { expect, test } from '@playwright/test';

test('mostra o estado da nuvem compatível com a configuração do Supabase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Nuvem' })).toBeVisible();
  await expect(page.getByText(/Indisponível|Desconectado/)).toBeVisible();

  const unavailable = page.getByText('Indisponível');
  if (await unavailable.isVisible()) {
    await expect(page.getByText(/Configure as variáveis/)).toBeVisible();
  } else {
    await expect(page.getByText('Desconectado')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible();
  }
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
