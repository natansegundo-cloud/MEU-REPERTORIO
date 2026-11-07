import { expect, test } from '@playwright/test';

test('importa TXT, revisa o conteudo, salva e exporta backup', async ({ page }) => {
  const title = `Cifra TXT ${Date.now()}`;
  await page.goto('/');

  await page.getByRole('button', { name: 'Importar música' }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'petala.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Tom: C\nC\nPétala', 'utf8'),
  });
  await expect(page.getByText('Texto carregado. Revise antes de salvar.')).toBeVisible();
  await expect(page.locator('textarea')).toHaveValue('Tom: C\nC\nPétala');
  await page.getByLabel(/Título/).fill(title);
  await page.getByRole('button', { name: 'Importar música' }).click();

  await expect(page.getByText(title)).toBeVisible();
  await page
    .getByRole('navigation', { name: /Navegação/ })
    .getByRole('button', { name: 'Ajustes' })
    .click();
  await expect(page.getByRole('heading', { name: 'Backup local' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^meu-repertorio-backup-\d{4}-\d{2}-\d{2}\.json$/u,
  );
});
