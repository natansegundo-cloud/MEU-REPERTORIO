import { expect, test } from '@playwright/test';

import { navigateTo } from './navigation';

test('inicializa a aplicação sem erros de console', async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Meu Repertório/);
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeVisible();
  const desktopNavigation = page.getByRole('navigation', { name: 'Navegação principal' });
  const mobileMenu = page.getByRole('button', { name: 'Abrir menu' });
  expect((await desktopNavigation.isVisible()) || (await mobileMenu.isVisible())).toBe(true);
  await expect(page.getByText('Sua biblioteca começa aqui')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('navega entre os módulos da fundação', async ({ page }) => {
  await page.goto('/');

  const desktopNavigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await navigateTo(page, 'Repertórios');

  await expect(page.getByRole('heading', { level: 1, name: 'Repertórios' })).toBeVisible();
  if (await desktopNavigation.isVisible()) {
    await expect(desktopNavigation.getByRole('button', { name: 'Repertórios' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});
