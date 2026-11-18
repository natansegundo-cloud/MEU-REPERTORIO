import { expect, test } from '@playwright/test';

import { navigateTo } from './navigation';

test('alterna entre Sistema, Claro e Escuro, persiste após recarga e sincroniza theme-color', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const browserGlobals = globalThis as unknown as {
      __themeAtDomContentLoaded?: string | null;
      document: {
        addEventListener: (type: string, listener: () => void) => void;
        documentElement: { dataset: { theme?: string } };
      };
    };
    browserGlobals.document.addEventListener('DOMContentLoaded', () => {
      browserGlobals.__themeAtDomContentLoaded =
        browserGlobals.document.documentElement.dataset.theme ?? null;
    });
  });

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0c0e');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f5f7');

  await navigateTo(page, 'Ajustes');
  await expect(page.getByRole('heading', { level: 2, name: 'Aparência' })).toBeVisible();

  await page.getByText('Escuro', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0c0e');

  await page.reload();
  const themeAtDomContentLoaded = await page.evaluate(() => {
    const browserGlobals = globalThis as unknown as {
      __themeAtDomContentLoaded?: string | null;
    };
    return browserGlobals.__themeAtDomContentLoaded ?? null;
  });
  expect(themeAtDomContentLoaded).toBe('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'Escuro' })).toBeChecked();

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByText('Claro', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f5f7');

  await navigateTo(page, 'Repertórios');
  await page.getByLabel('Novo repertório').fill('Show Teste');
  await page.getByRole('button', { name: 'Criar repertório' }).click();
  await page.getByRole('button', { name: /Tocar Show Teste/i }).click();

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0c0e');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f5f7');
});

test('mantém inputs com fonte mínima de 16px no mobile para evitar auto-zoom no Safari iOS', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#library');

  await expect(page.getByPlaceholder('Pesquisar por título, artista ou tom')).toHaveCSS(
    'font-size',
    '16px',
  );

  await page.goto('/#library/import');
  await expect(page.getByLabel(/Título/i)).toHaveCSS('font-size', '16px');
  await expect(page.getByLabel(/Letra e cifras/i)).toHaveCSS('font-size', '16px');
});
