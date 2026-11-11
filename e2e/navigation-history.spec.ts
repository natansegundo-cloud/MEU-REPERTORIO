import { expect, test, type Page } from '@playwright/test';

import { navigateTo, selectLibraryAction } from './navigation';

async function importSong(page: Page, title: string, content: string): Promise<void> {
  await selectLibraryAction(page, 'Adicionar música');
  await page.getByLabel(/título/i).fill(title);
  await page.getByLabel(/letra e cifras/i).fill(content);
  await page.getByRole('button', { name: /Importar m/ }).click();
  await expect(page.getByText(new RegExp(`${title}.*foi adicionada`))).toBeVisible();
}

interface BrowserHistory {
  readonly history: {
    back: () => void;
    forward: () => void;
  };
}

async function historyBack(page: Page): Promise<void> {
  await page.evaluate(() => (globalThis as unknown as BrowserHistory).history.back());
}

async function historyForward(page: Page): Promise<void> {
  await page.evaluate(() => (globalThis as unknown as BrowserHistory).history.forward());
}

test('volta e avança entre biblioteca e música pelo histórico do navegador', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Navegação A', 'Tom: C\nC\nLetra A');

  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Navegação A' })).toBeVisible();
  await expect(page).toHaveURL(/#library\/song\//);
  const songUrl = page.url();

  await historyBack(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page).toHaveURL(/#library$/);

  await historyForward(page);
  await expect(page.getByRole('heading', { name: 'Navegação A' })).toBeVisible();
  expect(page.url()).toBe(songUrl);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Navegação A' })).toBeVisible();
  await expect(page.getByText('Letra A')).toBeVisible();
});

test('encadeia edição, música e biblioteca no histórico', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Camadas', 'Tom: C\nC\nLetra original');

  await page.getByTestId('song-card').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Editar música' }).click();
  await page.getByLabel('Título').fill('Camadas editadas');
  await page.getByRole('button', { name: 'Salvar alterações' }).last().click();
  await expect(page.getByText('Alterações salvas com sucesso.')).toBeVisible();
  await expect(page).toHaveURL(/\/edit$/);

  await page.getByRole('button', { name: 'Voltar para a música' }).click();
  await expect(page.getByRole('heading', { name: 'Camadas editadas' })).toBeVisible();
  await expect(page).toHaveURL(/#library\/song\/[^/]+$/);

  await historyBack(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page).toHaveURL(/#library$/);
});

test('protege alterações não salvas contra o botão voltar do navegador', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Edição protegida', 'Tom: D\nD\nLetra D');

  await page.getByTestId('song-card').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Editar música' }).click();
  await page.getByLabel('Título').fill('Edição protegida alterada');
  await expect(page).toHaveURL(/\/edit$/);

  const messages: string[] = [];
  page.once('dialog', async (dialog) => {
    messages.push(dialog.message());
    await dialog.dismiss();
  });

  await historyBack(page);
  await expect(page.getByRole('heading', { name: 'Editar música' })).toBeVisible();
  await expect(page).toHaveURL(/\/edit$/);
  expect(messages[0]).toContain('alterações não salvas');

  page.once('dialog', (dialog) => dialog.accept());
  await historyBack(page);
  await expect(page.getByRole('heading', { name: 'Edição protegida' })).toBeVisible();
  await expect(page).toHaveURL(/#library\/song\/[^/]+$/);
});

test('preserva a origem dos favoritos ao voltar', async ({ page }) => {
  await page.goto('/');
  await importSong(page, 'Favorita', 'Tom: E\nE\nLetra E');
  await page.getByRole('button', { name: 'Favoritar Favorita' }).click();

  await navigateTo(page, 'Favoritos');
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page).toHaveURL(/#favorites\/song\//);

  await historyBack(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
  await expect(page).toHaveURL(/#favorites$/);

  await page.getByTestId('song-card').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Voltar para os favoritos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
  await expect(page).toHaveURL(/#favorites$/);
});

test('mantém hash externo intacto e abre a biblioteca como fallback', async ({ page }) => {
  await page.goto('/#access_token=exemplo&type=recovery');

  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await expect(page).toHaveURL(/#access_token=exemplo&type=recovery$/);
});
