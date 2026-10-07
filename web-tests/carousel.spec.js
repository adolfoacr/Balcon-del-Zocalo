import { test, expect } from '@playwright/test';
import { standaloneOnly, mockPublicSite } from './standalone-helper.js';

const start = new Date('2026-10-07T12:00:00Z');
test.beforeEach(async ({page}, info) => {
  if (info.project.metadata.standalone) await standaloneOnly(page); else await mockPublicSite(page);
  await page.clock.install({time:start});
  await page.clock.pauseAt(start);
});
const hero = page => page.locator('[data-carousel="carrusel de portada"]');
const stories = page => page.locator('[data-carousel="carrusel de historias"]');

test('photographs and stories advance every three seconds and loop', async ({page}) => {
  await page.goto('/');
  for (const carousel of [hero(page),stories(page)]) await expect(carousel).toHaveAttribute('data-active-slide','0');
  await page.clock.runFor(2999);
  for (const carousel of [hero(page),stories(page)]) await expect(carousel).toHaveAttribute('data-active-slide','0');
  await page.clock.runFor(1);
  for (const carousel of [hero(page),stories(page)]) {
    await expect(carousel).toHaveAttribute('data-active-slide','1');
    await expect(carousel.locator('[data-carousel-slide]:not([hidden])')).toHaveCount(1);
  }
  await page.clock.runFor(3000);
  for (const carousel of [hero(page),stories(page)]) await expect(carousel).toHaveAttribute('data-active-slide','0');
});

test('arrows work without a play button and focus pauses automatic advance', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('[data-carousel-toggle]')).toHaveCount(0);
  await page.getByRole('button',{name:'Imagen siguiente de carrusel de portada'}).click();
  await expect(hero(page)).toHaveAttribute('data-active-slide','1');
  await page.clock.runFor(6000);
  await expect(hero(page)).toHaveAttribute('data-active-slide','1');
  await page.getByRole('button',{name:'Imagen anterior de carrusel de portada'}).click();
  await expect(hero(page)).toHaveAttribute('data-active-slide','0');
  await page.getByRole('button',{name:'Imagen siguiente de carrusel de historias'}).click();
  await expect(stories(page)).toHaveAttribute('data-active-slide','1');
  await page.mouse.move(0,0);
  await page.getByRole('link',{name:'Iniciar sesión',exact:true}).focus();
  await page.clock.runFor(3000);
  await expect(hero(page)).toHaveAttribute('data-active-slide','1');
});

test('leaving Noticias disposes its timers and returning starts a fresh carousel', async ({page}) => {
  await page.goto('/');
  const previous = await hero(page).elementHandle();
  await page.getByRole('link',{name:'Recetario',exact:true}).click();
  await page.clock.runFor(3000);
  expect(await previous.getAttribute('data-active-slide')).toBe('0');
  await page.getByRole('link',{name:'Noticias',exact:true}).click();
  await expect(hero(page)).toHaveAttribute('data-active-slide','0');
  await page.clock.runFor(3000);
  await expect(hero(page)).toHaveAttribute('data-active-slide','1');
});

test('reduced motion starts paused and permits manual navigation', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.clock.runFor(6000);
  await expect(hero(page)).toHaveAttribute('data-active-slide','0');
  await page.getByRole('button',{name:'Imagen siguiente de carrusel de portada'}).click();
  await page.mouse.move(0,0);
  await page.clock.runFor(3000);
  await expect(hero(page)).toHaveAttribute('data-active-slide','1');
});
