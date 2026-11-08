import { expect, test } from '@playwright/test';

test('importa TXT, revisa o conteudo e salva a cifra', async ({ page }) => {
  const title = `Cifra TXT ${Date.now()}`;
  await page.goto('/');

  await page.getByRole('button', { name: /Importar/ }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'petala.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Tom: C\nC\nPétala', 'utf8'),
  });
  await expect(page.getByText('Texto carregado. Revise antes de salvar.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Letra e cifras' })).toHaveValue(
    'Tom: C\nC\nPétala',
  );
  await page.getByLabel(/Título/).fill(title);
  await page.getByRole('button', { name: /Importar/ }).click();

  await expect(page.getByTestId('song-card').getByText(title)).toBeVisible();
});
