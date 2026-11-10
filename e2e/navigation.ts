import type { Page } from '@playwright/test';

export async function selectLibraryAction(page: Page, action: string): Promise<void> {
  await page.getByRole('button', { name: 'Adicionar conteúdo' }).click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}

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
