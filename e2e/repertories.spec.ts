import { expect, test, type Page } from '@playwright/test';

async function importSong(page: Page, title: string, content: string) {
  await page.getByRole('button', { name: 'Importar música' }).click();
  await page.getByLabel(/título/i).fill(title);
  await page.getByLabel(/letra e cifras/i).fill(content);
  await page.getByRole('button', { name: 'Importar música' }).click();
  await expect(page.getByText(new RegExp(`${title}.*foi adicionada à biblioteca`))).toBeVisible();
}

test('cria, adiciona, reordena e mantém um repertório após recarregar', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Canção A', 'Tom: C\nC\nLetra A');
  await importSong(page, 'Canção B', 'Tom: D\nD\nLetra B');

  await page.getByRole('button', { name: 'Repertórios' }).first().click();
  await page.getByLabel('Novo repertório').fill('Setlist de sábado');
  await page.getByRole('button', { name: 'Criar repertório' }).click();
  await page.getByTestId('repertory-card').getByRole('button').first().click();

  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: 'Adicionar (2)' }).click();
  await expect(page.getByTestId('repertory-item')).toHaveCount(2);

  await page
    .getByTestId('repertory-item')
    .nth(0)
    .getByRole('button', { name: 'Descer Canção A' })
    .click();
  await expect(page.getByTestId('repertory-item').nth(0)).toContainText('Canção B');
  await page.getByTestId('repertory-item').nth(0).getByLabel('Tom próprio').fill('E');
  await page.getByTestId('repertory-item').nth(0).getByLabel('Tom próprio').press('Tab');

  await page.reload();
  await page.getByRole('button', { name: 'Repertórios' }).first().click();
  await page.getByTestId('repertory-card').getByRole('button').first().click();
  await expect(page.getByTestId('repertory-item').nth(0)).toContainText('Canção B');
  await expect(page.getByTestId('repertory-item').nth(0)).toContainText('Tom: E');
});

test('permanece utilizável sem rede depois de carregar a aplicação', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);

  await page.getByRole('button', { name: 'Repertórios' }).first().click();
  await expect(page.getByRole('heading', { name: 'Repertórios' })).toBeVisible();
  await expect(page.getByText('Crie seu primeiro repertório')).toBeVisible();
});

test('reordena itens por gesto de toque no editor', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Toque A', 'Tom: C\nC\nLetra A');
  await importSong(page, 'Toque B', 'Tom: D\nD\nLetra B');

  await page.getByRole('button', { name: 'Repertórios' }).first().click();
  await page.getByLabel('Novo repertório').fill('Ordem por toque');
  await page.getByRole('button', { name: 'Criar repertório' }).click();
  await page.getByTestId('repertory-card').getByRole('button').first().click();
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: /Adicionar \(2\)/ }).click();
  await expect(page.getByTestId('repertory-item')).toHaveCount(2);

  const items = page.getByTestId('repertory-item');
  await items.nth(0).locator('[role="button"]').dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
  });
  await items.nth(1).dispatchEvent('pointermove', { pointerId: 1, pointerType: 'touch' });
  await items.nth(1).dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
  });
  await expect(items.nth(0)).toContainText('Toque B');
});
