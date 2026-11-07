import { expect, test } from '@playwright/test';

test('importa, pesquisa, abre e mantém uma música após recarregar', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Importar música' }).click();
  await page.getByLabel(/título/i).fill('Uma Vez Mais');
  await page.getByLabel(/artista/i).fill('Natiruts');
  await page.getByLabel(/letra e cifras/i).fill('Tom: A\nA7M        E/G#\nMinha letra');
  await page.getByRole('button', { name: 'Importar música' }).click();

  await expect(page.getByText('“Uma Vez Mais” foi adicionada à biblioteca.')).toBeVisible();
  await expect(page.getByTestId('song-card')).toContainText('Natiruts');

  await page.getByRole('searchbox').fill('Natiruts');
  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Uma Vez Mais' })).toBeVisible();
  await expect(page.getByLabel('Cifras')).toContainText('A7M');

  await page.reload();
  await expect(page.getByTestId('song-card')).toBeVisible();
  await expect(page.getByText('Uma Vez Mais')).toBeVisible();
});

test('exibe diagnóstico impeditivo e não salva entrada vazia', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Importar música' }).click();
  await page.getByLabel(/letra e cifras/i).fill('Tom: A');
  await page.getByRole('button', { name: 'Importar música' }).click();

  await expect(page.getByRole('alert')).toContainText('A música não foi salva');
  await expect(page.getByText(/foi adicionada à biblioteca/)).toHaveCount(0);
});

test('edita uma música, salva o tom preferido e reabre a versão persistida', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Importar música' }).click();
  await page.getByLabel(/título/i).fill('Música editável');
  await page.getByLabel(/letra e cifras/i).fill('Tom: C\nC\nLetra original');
  await page.getByRole('button', { name: 'Importar música' }).click();

  await page.getByTestId('song-card').getByRole('button').first().click();
  await page.getByRole('button', { name: 'Editar música' }).click();
  await page.getByLabel('Título').fill('Música persistida');
  await page.getByRole('textbox', { name: 'Letra', exact: true }).fill('Letra corrigida');
  await page.getByLabel('Tom preferido').fill('D');
  await page.getByRole('button', { name: 'Adicionar cifra' }).click();
  await page.getByRole('button', { name: 'Salvar alterações' }).last().click();

  await expect(page.getByText('Alterações salvas com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para a música' }).click();
  await expect(page.getByRole('heading', { name: 'Música persistida' })).toBeVisible();
  await expect(page.getByText('Letra corrigida')).toBeVisible();
  await expect(page.getByText('D', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('song-card')).toBeVisible();
  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Música persistida' })).toBeVisible();
  await expect(page.getByText('Letra corrigida')).toBeVisible();
});
