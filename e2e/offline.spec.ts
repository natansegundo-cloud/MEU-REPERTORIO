import { expect, test } from '@playwright/test';

type ServiceWorkerApi = {
  readonly ready: Promise<unknown>;
};

type CacheStorageApi = {
  keys: () => Promise<string[]>;
};

test('mantém a navegação essencial disponível depois de ficar offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  await page.evaluate(async () => {
    const browserNavigator = navigator as Navigator & { serviceWorker: ServiceWorkerApi };
    await browserNavigator.serviceWorker.ready;
  });

  const cacheKeys = await page.evaluate(() => {
    const browserCaches = (globalThis as typeof globalThis & { caches: CacheStorageApi }).caches;
    return browserCaches.keys();
  });
  expect(cacheKeys.some((key) => key.includes('workbox-precache'))).toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: /Navegação/ });
  await navigation.getByRole('button', { name: 'Repertórios' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Repertórios' })).toBeVisible();
  await navigation.getByRole('button', { name: 'Favoritos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
});
