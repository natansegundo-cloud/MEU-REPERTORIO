import { expect, test } from '@playwright/test';

import { selectLibraryAction } from './navigation';

test('mantem a leitura focada e abre o diagrama sem deslocar a cifra', async ({ page }) => {
  await page.setViewportSize({ width: 343, height: 648 });
  await page.goto('/');
  await selectLibraryAction(page, 'Adicionar música');
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
      await page.evaluate(() => {
        const browserGlobals = globalThis as unknown as {
          document: { documentElement: { scrollWidth: number } };
          window: { innerWidth: number };
        };
        return (
          browserGlobals.document.documentElement.scrollWidth <= browserGlobals.window.innerWidth
        );
      }),
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

  const saveTone = page.getByRole('button', { name: 'Salvar tom' });
  const saveToneBox = await saveTone.boundingBox();
  expect(saveToneBox).not.toBeNull();
  expect((saveToneBox?.x ?? 0) + (saveToneBox?.width ?? 0)).toBeLessThanOrEqual(343);

  await page.getByRole('button', { name: 'Ver diagrama de C' }).click();
  await expect(page.getByRole('dialog', { name: 'Diagrama de acorde C' })).toBeVisible();

  const nextVariation = page.getByRole('button', { name: 'Próxima variação' });
  const nextVariationBox = await nextVariation.boundingBox();
  expect(nextVariationBox).not.toBeNull();
  expect(nextVariationBox?.width ?? 0).toBeGreaterThanOrEqual(36);
  expect(nextVariationBox?.height ?? 0).toBeGreaterThanOrEqual(36);

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

test('oferece rolagem automática na leitura normal da música', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await selectLibraryAction(page, 'Adicionar música');
  await page.getByLabel(/t.*tulo/i).fill('Rolagem na leitura');
  const longSong = Array.from({ length: 80 }, (_, index) =>
    index % 2 === 0 ? `Verso ${index + 1}` : 'D                 A',
  ).join('\n');
  await page.getByLabel(/letra e cifras/i).fill(longSong);
  await page.getByRole('button', { name: /Importar/ }).click();

  await page.getByTestId('song-card').getByRole('button').first().click();
  await expect(page.getByRole('heading', { name: 'Rolagem na leitura' })).toBeVisible();

  const speed = page.getByRole('slider', { name: 'Velocidade da rolagem' });
  await speed.fill('5');
  await expect(page.getByText('5 px/s', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aumentar velocidade da rolagem em 5 px/s' }).click();
  await expect(page.getByText('10 px/s', { exact: true })).toBeVisible();

  async function scrollPosition(): Promise<number> {
    return page.evaluate(() => (globalThis as unknown as { scrollY: number }).scrollY);
  }

  await page.getByRole('button', { name: 'Iniciar rolagem' }).click();
  await page.waitForTimeout(600);
  expect(await scrollPosition()).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Pausar rolagem' }).click();
  const pausedPosition = await scrollPosition();
  await page.waitForTimeout(300);
  expect(await scrollPosition()).toBe(pausedPosition);
});
