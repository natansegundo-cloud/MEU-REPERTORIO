import type { Page } from '@playwright/test';

export async function navigateTo(page: Page, label: string): Promise<void> {
  const mobileTrigger = page.getByRole('button', { name: 'Abrir menu' });
  if (await mobileTrigger.isVisible()) {
    await mobileTrigger.click();
    await page
      .getByRole('navigation', { name: 'Navegação móvel' })
      .getByRole('button', { name: label, exact: true })
      .click();
    return;
  }

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('button', { name: label, exact: true })
    .click();
}
