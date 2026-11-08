import { expect, test } from '@playwright/test';

test('mantem a leitura focada e abre o diagrama sem deslocar a cifra', async ({ page }) => {
  await page.setViewportSize({ width: 343, height: 648 });
  await page.goto('/');
  await page.getByRole('button', { name: /Importar/ }).click();
  await page.getByLabel(/t.*tulo/i).fill('Leitura compacta');
  await page.getByLabel(/letra e cifras/i).fill('Tom: C\nC       G\nMinha letra');
  await page.getByRole('button', { name: /Importar/ }).click();

  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Leitura compacta' })).toBeVisible();

  for (const viewport of [
    { width: 343, height: 648 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('main', { name: /Conte.*Leitura compacta/ })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 343, height: 648 });

  await expect(page.getByRole('button', { name: 'Exportar TXT' })).toHaveCount(0);

  await page.getByRole('button', { name: /Mais/ }).click();
  await expect(page.getByRole('button', { name: 'Exportar TXT' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Adicionar a um repert/ })).toBeVisible();
  await page.getByRole('heading', { name: 'Leitura compacta' }).click();
  await expect(page.getByRole('button', { name: 'Exportar TXT' })).toHaveCount(0);

  const options = page.locator('details').filter({ hasText: /Op.*es de leitura/ });
  await expect(options).not.toHaveAttribute('open', '');
  await options.locator('summary').click();
  await page.getByRole('switch', { name: /Exibir diagramas/ }).check();

  await page.getByRole('button', { name: 'Ver diagrama de C' }).click();
  await expect(page.getByRole('dialog', { name: 'Diagrama de acorde C' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver diagrama de G' }).click();
  await expect(page.getByRole('dialog', { name: 'Diagrama de acorde G' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const tone = page.getByRole('region', { name: 'Controles de tom' });
  await tone.getByRole('button', { name: 'Subir um semitom' }).click();
  await expect(tone.getByText('C#')).toBeVisible();
  await tone.getByRole('button', { name: 'Salvar tom' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tom preferido salvo' })).toBeVisible();
});
