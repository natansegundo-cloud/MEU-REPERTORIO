import { expect, test } from '@playwright/test';

import { selectLibraryAction } from './navigation';

test('abre a revisão de importação em lote e informa DOCX inválido', async ({ page }) => {
  await page.goto('/');
  await selectLibraryAction(page, 'Importar em lote');
  await expect(page.getByRole('heading', { name: 'Importar músicas em lote' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'arquivo-invalido.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('não é um DOCX válido', 'utf8'),
  });

  await expect(page.getByRole('alert')).toContainText('Não foi possível ler este DOCX');
  await expect(page.getByText(/blocos encontrados/)).toHaveCount(0);
});
