import { expect, test } from '@playwright/test';

test('mantém a navegação essencial disponível depois de ficar offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await page.evaluate(async () => {
    const serviceWorker = (navigator as Navigator & { serviceWorker?: { ready: Promise<unknown> } })
      .serviceWorker;
    if (serviceWorker) await serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: /Navegação/ });
  await navigation.getByRole('button', { name: 'Repertórios' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Repertórios' })).toBeVisible();
  await navigation.getByRole('button', { name: 'Favoritos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
});
