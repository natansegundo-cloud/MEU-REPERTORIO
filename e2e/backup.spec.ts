import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { navigateTo, selectLibraryAction } from './navigation';

async function importSong(page: Page, title: string, content: string): Promise<void> {
  await page.goto('/');
  await selectLibraryAction(page, 'Adicionar música');
  await page.getByLabel(/título/i).fill(title);
  await page.getByLabel(/letra e cifras/i).fill(content);
  await page.getByRole('button', { name: 'Importar música' }).click();
  await expect(page.getByTestId('song-card')).toContainText(title);
}

async function downloadContent(
  page: Page,
  buttonName: string,
): Promise<{ name: string; content: string }> {
  if (buttonName === 'Exportar TXT') {
    await page.getByRole('button', { name: 'Mais ações' }).click();
  }
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return {
    name: download.suggestedFilename(),
    content: await readFile(path, 'utf8'),
  };
}

test('exporta e restaura um backup completo pela tela de ajustes', async ({ page }) => {
  await importSong(page, 'Backup de teste', 'Tom: C\nC G\nLetra original');
  await navigateTo(page, 'Ajustes');
  await expect(page.getByRole('heading', { level: 1, name: 'Preferências' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dados' })).toBeVisible();
  await expect(page.getByText('Sobre o formato do backup').locator('..')).not.toHaveAttribute(
    'open',
  );

  const exported = await downloadContent(page, 'Exportar biblioteca');
  expect(exported.name).toMatch(/^meu-repertorio-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(exported.content)).toMatchObject({
    format: 'meu-repertorio-backup',
    version: 1,
    data: { songs: [expect.objectContaining({ title: 'Backup de teste' })] },
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: exported.name,
    mimeType: 'application/json',
    buffer: Buffer.from(exported.content),
  });
  await expect(page.getByText(exported.name)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Iguais')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar backup' }).click();

  await expect(page.getByText(/Restauração concluída/)).toContainText('conflito(s) preservado(s)');
});

test('exporta uma música individual em TXT com o conteúdo original', async ({ page }, testInfo) => {
  await importSong(page, 'Música para TXT', 'Tom: G\nG D\nMinha letra original');
  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Música para TXT' })).toBeVisible();

  if (testInfo.project.name === 'mobile-chrome') {
    await page.getByRole('button', { name: 'Mais ações' }).click();
    await page.getByRole('button', { name: 'Exportar TXT' }).dispatchEvent('click');
    await expect(page.getByRole('status').filter({ hasText: /exportada em TXT/ })).toBeVisible();
    return;
  }

  const exported = await downloadContent(page, 'Exportar TXT');

  expect(exported.name).toBe('musica-para-txt.txt');
  expect(exported.content).toContain('Tom: G');
  expect(exported.content).toContain('Minha letra original');
});

test('mostra erro claro para arquivo de backup inválido', async ({ page }) => {
  await page.goto('/');
  await navigateTo(page, 'Ajustes');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalido.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });

  await expect(page.getByRole('alert')).toContainText('não é um backup');
});
