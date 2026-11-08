import { expect, test } from '@playwright/test';

import { navigateTo } from './navigation';

type ServiceWorkerRegistrationLike = {
  readonly active?: { readonly scriptURL: string } | null;
};

type ServiceWorkerApi = {
  readonly ready: Promise<ServiceWorkerRegistrationLike>;
};

test('publica um manifest instalável com identidade e ícones válidos', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    'content',
    'yes',
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    'content',
    'Meu Repertório',
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute(
    'content',
    'default',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/brand/icon-192.png',
  );

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');
  if (!manifestHref) throw new Error('Manifest link não encontrado');

  const manifestResponse = await page.request.get(manifestHref);
  expect(manifestResponse.ok()).toBe(true);

  const manifest = (await manifestResponse.json()) as {
    id: string;
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    scope: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };

  expect(manifest).toMatchObject({
    id: '/',
    name: 'Meu Repertório',
    short_name: 'Repertório',
    display: 'standalone',
    start_url: '/',
    scope: '/',
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: 'brand/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: 'brand/icon-512.png', sizes: '512x512' }),
      expect.objectContaining({
        src: 'brand/maskable-512.png',
        sizes: '512x512',
        purpose: 'maskable',
      }),
    ]),
  );

  await navigateTo(page, 'Ajustes');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Adicionar à Tela de Início' }),
  ).toBeVisible();
  await page.getByText('Como instalar pelo Safari').click();
  await expect(page.getByText('Toque em Compartilhar.')).toBeVisible();
});

test('registra o Service Worker e recarrega o shell em modo offline', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();

  const serviceWorkerUrl = await page.evaluate(async () => {
    const browserNavigator = navigator as Navigator & { serviceWorker: ServiceWorkerApi };
    const registration = await browserNavigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? null;
  });
  expect(serviceWorkerUrl).toContain('/sw.js');

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  const mobileMenu = page.getByRole('button', { name: 'Abrir menu' });
  if (await mobileMenu.isVisible()) {
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
  } else {
    await expect(page.locator('nav[aria-label="Navegação principal"]:visible')).toHaveCount(1);
  }
});
