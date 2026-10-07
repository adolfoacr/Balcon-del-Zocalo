import { test, expect } from '@playwright/test';
import { standaloneOnly } from './standalone-helper.js';

test('the delivered HTML loads its design and interactions without companion files', async ({ page }, info) => {
  // The managed browser blocks file:// navigation. Feed it the delivered bytes,
  // with every other HTTP resource denied, rather than relaxing that policy.
  const requests = await standaloneOnly(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 27)');
  await page.getByRole('link',{ name:'Recetario', exact:true }).click();
  await expect(page.locator('.dish-card')).toHaveCount(2);
  await page.getByRole('searchbox').fill('MAIZ');
  await expect(page.locator('.dish-card')).toHaveCount(1);
  await page.getByRole('button',{ name:/Ver ingredientes/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Maíz azul');
  await page.keyboard.press('Escape');
  await page.getByRole('link',{ name:'Nuestro libro', exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Un lugar para cada página.' })).toBeVisible();
  await page.screenshot({ path:`test-results/${info.project.name}-archivo.png`, fullPage:true });
  expect(requests).toEqual([]);
});

test('a viewer without scripts still displays styled content instead of a loading screen', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled:false, viewport:info.project.use.viewport });
  const page = await context.newPage();
  const requests = await standaloneOnly(page);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading',{ name:'Una mesa. Muchas historias.' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 27)');
  await page.getByRole('link',{ name:'Recetario', exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Fideo seco con chicharrón de filete' })).toBeVisible();
  await expect(page.getByText('Preparando tu experiencia…')).toHaveCount(0);
  expect(requests).toEqual([]);
  await context.close();
});
