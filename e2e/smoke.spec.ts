import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('navigation', { name: /Navegação/ })).toBeVisible();
  await expect(page.getByText('Sua biblioteca começa aqui')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('navega entre os módulos da fundação', async ({ page }) => {
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: /Navegação/ });

  await navigation.getByRole('button', { name: 'Repertórios' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Repertórios' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Repertórios' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
