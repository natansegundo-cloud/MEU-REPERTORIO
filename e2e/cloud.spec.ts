import { expect, test } from '@playwright/test';

import { navigateTo } from './navigation';

test('mostra o estado da nuvem compatível com a configuração do Supabase', async ({ page }) => {
  await page.goto('/');
  await navigateTo(page, 'Ajustes');

  await expect(page.getByRole('heading', { level: 1, name: 'Preferências' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Nuvem e conta' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Nuvem' })).toBeVisible();
  await expect(page.getByText(/Indisponível|Desconectado/)).toBeVisible();

  const unavailable = page.getByText('Indisponível');
  if (await unavailable.isVisible()) {
    await expect(page.getByText(/Configure as variáveis/)).toBeVisible();
  } else {
    await expect(page.getByText('Desconectado')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeVisible();
  }
});

test('area de nuvem nao cria rolagem horizontal nos tamanhos principais', async ({ page }) => {
  await page.goto('/');
  await navigateTo(page, 'Ajustes');

  for (const viewport of [
    { width: 343, height: 648 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { level: 1, name: 'Preferências' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Nuvem e conta' })).toBeVisible();
    const scrollWidth = await page.locator('html').evaluate((element: unknown) => {
      if (!element || typeof element !== 'object') return 0;
      const value = (element as { scrollWidth?: unknown }).scrollWidth;
      return typeof value === 'number' ? value : 0;
    });
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  }
});
