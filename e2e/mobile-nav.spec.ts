import { expect, test } from '@playwright/test';

test.describe('navegação mobile por menu superior', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
  });

  test('abre, navega, fecha com Escape e clique fora', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Abrir menu' });
    await expect(trigger).toBeVisible();
    await expect(page.locator('nav[aria-label="Navegação móvel"]')).toHaveCount(0);

    await trigger.click();
    const menu = page.getByRole('navigation', { name: 'Navegação móvel' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Biblioteca' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(menu.getByRole('button', { name: 'Biblioteca' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole('button', { name: 'Fechar menu ao tocar fora' }).click();
    await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('navega pelas quatro seções e fecha o menu ao selecionar', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Abrir menu' });
    const sections = [
      { label: 'Biblioteca', heading: 'Biblioteca' },
      { label: 'Repertórios', heading: 'Repertórios' },
      { label: 'Favoritos', heading: 'Favoritos' },
      { label: 'Ajustes', heading: 'Preferências' },
    ];

    for (const section of sections) {
      await trigger.click();
      const menu = page.getByRole('navigation', { name: 'Navegação móvel' });
      await menu.getByRole('button', { name: section.label, exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Navegação móvel' })).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: section.heading })).toBeVisible();
    }
  });
});
