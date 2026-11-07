import { expect, test, type Page } from '@playwright/test';

interface ViewportWindow {
  readonly innerWidth: number;
  readonly document: { readonly documentElement: { readonly scrollWidth: number } };
}

async function importSong(page: Page, title: string, content: string) {
  await page.getByRole('button', { name: /Importar m/ }).click();
  await page.getByLabel(/título/i).fill(title);
  await page.getByLabel(/letra e cifras/i).fill(content);
  await page.getByRole('button', { name: /Importar m/ }).click();
  await expect(page.getByText(new RegExp(`${title}.*foi adicionada`))).toBeVisible();
}

async function createShow(page: Page) {
  await page
    .getByRole('button', { name: /Repertórios/ })
    .first()
    .click();
  await page.getByLabel('Novo repertório').fill('Show de teste');
  await page.getByRole('button', { name: /Criar repertório/ }).click();
  await page.getByTestId('repertory-card').getByRole('button').first().click();
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: /Adicionar \(2\)/ }).click();
  await expect(page.getByTestId('repertory-item')).toHaveCount(2);
}

test('abre, navega, ajusta tom e sai do modo show', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Show A', 'Tom: C\nC\nLetra A');
  await importSong(page, 'Show B', 'Tom: D\nD7M\nLetra B');
  await createShow(page);

  await page.getByRole('button', { name: 'Tocar' }).click();
  await expect(page).toHaveURL(/#show\//);
  await expect(page.getByRole('heading', { name: 'Show A' })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Show B' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'Show A' })).toBeVisible();

  await page.getByRole('button', { name: 'Abrir controles' }).click();
  await page.getByRole('button', { name: 'Subir um semitom' }).click();
  await expect(page.getByRole('status')).toContainText('Tom do item:');
  await page.getByRole('button', { name: 'Sair' }).first().click();
  await page.getByRole('button', { name: 'Sair', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Show de teste' })).toBeVisible();
});

test('retoma a música atual após recarregar e continua offline', async ({ page, context }) => {
  await page.goto('/');
  await importSong(page, 'Retomar A', 'Tom: C\nC\nLetra A');
  await importSong(page, 'Retomar B', 'Tom: D\nD\nLetra B');
  await createShow(page);
  await page.getByRole('button', { name: 'Tocar' }).click();
  await expect(page.getByRole('heading', { name: 'Retomar A' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Retomar B' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Retomar B' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Retomar B' })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const pageWindow = globalThis as unknown as ViewportWindow;
      return pageWindow.document.documentElement.scrollWidth <= pageWindow.innerWidth;
    }),
  ).toBe(true);
});

test('funciona em viewport estreita e aceita gesto horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await importSong(page, 'Gesto A', 'Tom: C\nC\nLetra A');
  await importSong(page, 'Gesto B', 'Tom: D\nD\nLetra B');
  await createShow(page);
  await page.getByRole('button', { name: 'Tocar' }).click();

  const show = page.locator('[class*="page"]').first();
  await show.dispatchEvent('touchstart', {
    touches: [{ identifier: 0, clientX: 300, clientY: 300 }],
    changedTouches: [{ identifier: 0, clientX: 300, clientY: 300 }],
  });
  await show.dispatchEvent('touchend', {
    changedTouches: [{ identifier: 0, clientX: 80, clientY: 305 }],
  });
  await expect(page.getByRole('heading', { name: 'Gesto B' })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const pageWindow = globalThis as unknown as ViewportWindow;
      return pageWindow.document.documentElement.scrollWidth <= pageWindow.innerWidth;
    }),
  ).toBe(true);
});
