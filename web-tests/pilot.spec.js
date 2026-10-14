import { samplePDF } from './pdf-fixture.js';
import { test, expect } from '@playwright/test';
import { standaloneOnly, mockPublicSite } from './standalone-helper.js';

let unexpectedResources;
test.beforeEach(async ({ page }, info) => {
  unexpectedResources = info.project.metadata.standalone ? await standaloneOnly(page) : (await mockPublicSite(page),null);
  if(/PDF|^book /.test(info.title)) {
    const id='00000000-0000-0000-0000-000000000001';
    await page.addInitScript(()=>sessionStorage.setItem('balcon-session:https://pqmxurrqpvubxccnsywu.supabase.co',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Date.now()/1000+3600})));
    await page.route('https://*.supabase.co/auth/v1/user',r=>r.fulfill({json:{id,email:'owner@example.test'}}));
    await page.route('https://*.supabase.co/rest/v1/cms_admins?*',r=>r.fulfill({json:[{user_id:id,owner:true}]}));
  }

});
test.afterEach(() => {
  if (unexpectedResources) expect(unexpectedResources, 'The self-contained HTML must not request companion files').toEqual([]);
});

async function uploadPDF(page) {
  await page.goto('/#libro');
  await page.locator('#book-file').setInputFiles({ name:'Libro de prueba.pdf', mimeType:'application/pdf', buffer:samplePDF() });
  await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');
}

test('navigation, editorial detail, and responsive layout', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'La cocina también se investiga.' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 23, 22)');
  await expect(page.getByRole('link', { name:'Inicio', exact:true })).toHaveAttribute('aria-current','page');
  await page.getByRole('link', { name:'Noticias', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Noticias y hallazgos' })).toBeVisible();
  await page.getByRole('button', { name:/Del ingrediente al proceso/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Contenido de muestra');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name:'Inicio', exact:true }).click();
  await page.getByRole('link', { name:/Ver recetario/ }).click();
  await expect(page.getByRole('link', { name:'Recetario', exact:true })).toHaveAttribute('aria-current','page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path:`test-results/${info.project.name}-recetario.png`, fullPage:true });
  expect(errors).toEqual([]);
});

test('ingredient search, categories, and useful empty state', async ({ page }) => {
  await page.goto('/#recetario');
  const search = page.getByRole('searchbox');
  await search.fill('MAIZ');
  await expect(page.locator('.dish-card')).toHaveCount(1);
  await expect(page.locator('.dish-card')).toContainText('Sope');
  await search.fill('chocolate');
  await expect(page.getByRole('heading',{ name:'No encontramos ese sabor' })).toBeVisible();
  await page.getByRole('button',{ name:'Ver todos los platos' }).click();
  await page.getByRole('button',{ name:'Entradas',exact:true }).click();
  await expect(page.locator('.dish-card')).toHaveCount(1);
  await search.fill('chile');
  await expect(page.locator('#result-count')).toHaveText('0 platos');
});

test('favorites survive reload and can be removed from detail', async ({ page }) => {
  await page.goto('/#recetario');
  await page.getByRole('button',{ name:'Favoritos',exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Aquí estarán tus favoritos' })).toBeVisible();
  await page.getByRole('button',{ name:'Ver todos los platos' }).click();
  await page.getByRole('button',{ name:/Guardar en favoritos: Fideo/ }).click();
  await page.reload();
  await page.getByRole('button',{ name:'Favoritos',exact:true }).click();
  await expect(page.locator('.dish-card')).toHaveCount(1);
  await page.getByRole('button',{ name:/Ver ingredientes/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Queso Ocosingo');
  await expect(page.getByRole('dialog')).toContainText('no es una guía para cocinar');
  await page.getByRole('button',{ name:'Quitar de favoritos',exact:true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading',{ name:'Aquí estarán tus favoritos' })).toBeVisible();
});

test('book is empty and rejects invalid or oversized files', async ({ page }) => {
  await page.goto('/#libro');
  await expect(page.getByRole('heading',{ name:'Un lugar para conservar lo aprendido.' })).toBeVisible();
  await page.locator('#book-file').setInputFiles({ name:'incorrecto.pdf', mimeType:'application/pdf', buffer:Buffer.from('Not a PDF') });
  await expect(page.getByRole('alert')).toContainText('No pudimos abrir');
  await page.locator('#book-file').setInputFiles({ name:'grande.pdf', mimeType:'application/pdf', buffer:Buffer.alloc(30 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('supera los 30 MB');
  await expect(page.locator('#pdf-canvas')).toHaveCount(0);
});

test('PDF renders both pages, persists locally, and removal requires confirmation', async ({ page }, info) => {
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await uploadPDF(page);
  await expect(page.locator('#page-text')).toContainText('pagina uno');
  await expect(page.getByRole('button',{ name:'Página anterior' })).toBeDisabled();
  const ink = await page.locator('#pdf-canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 180 && pixels[i + 3] > 0) return true;
    return false;
  });
  expect(ink).toBe(true);
  await page.getByRole('button',{ name:'Página siguiente' }).click();
  await expect(page.locator('#reader-status')).toHaveText('Página 2 de 2');
  await expect(page.locator('#page-text')).toContainText('pagina dos');
  await expect(page.getByRole('button',{ name:'Página siguiente' })).toBeDisabled();
  await page.locator('#page-number').fill('9');
  await page.locator('#page-number').press('Tab');
  await expect(page.locator('#page-number')).toHaveValue('2');
  await page.screenshot({ path:`test-results/${info.project.name}-lector.png`, fullPage:true });
  await page.reload();
  await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');
  await page.getByRole('button',{ name:'Retirar libro',exact:true }).click();
  await page.getByRole('button',{ name:'Conservar libro' }).click();
  await expect(page.locator('#pdf-canvas')).toBeVisible();
  await page.getByRole('button',{ name:'Retirar libro',exact:true }).click();
  await page.getByRole('dialog').getByRole('button',{ name:'Retirar libro',exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Un lugar para conservar lo aprendido.' })).toBeVisible();
  await page.reload();
  await expect(page.locator('#pdf-canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(writes).toEqual([]);
});

test('invalid replacement leaves the previous PDF available', async ({ page }) => {
  await uploadPDF(page);
  await page.locator('#book-file').setInputFiles({ name:'roto.pdf', mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.4 broken') });
  await expect(page.getByRole('alert')).toContainText('No pudimos abrir');
  await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');
  await page.getByRole('button',{ name:'Página siguiente' }).click();
  await expect(page.locator('#page-text')).toContainText('pagina dos');
});

test('a valid PDF can replace the saved book without breaking its reader', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await uploadPDF(page);
  await page.getByRole('button',{ name:'Página siguiente' }).click();
  await expect(page.locator('#reader-status')).toHaveText('Página 2 de 2');
  await page.locator('#book-file').setInputFiles({ name:'Nuevo libro.pdf', mimeType:'application/pdf', buffer:samplePDF() });
  await expect(page.getByRole('heading',{ name:'Nuevo libro.pdf' })).toBeVisible();
  await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');
  await page.reload();
  await expect(page.getByRole('heading',{ name:'Nuevo libro.pdf' })).toBeVisible();
  await page.getByRole('button',{ name:'Página siguiente' }).click();
  await expect(page.locator('#page-text')).toContainText('pagina dos');
  expect(errors).toEqual([]);
});

test('keyboard focus survives skipping content, toggling favorites, and closing a detail', async ({ page }) => {
  await page.goto('/#recetario');
  await expect(page.locator('.dish-card')).toHaveCount(2);
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(new URL(page.url()).hash).toBe('#recetario');
  const favorite = page.getByRole('button',{ name:/Guardar en favoritos: Fideo/ });
  await favorite.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button',{ name:/Quitar de favoritos: Fideo/ })).toBeFocused();
  const opener = page.getByRole('button',{ name:/Ver ingredientes/ }).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{ name:'Cerrar detalle' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('slow library startup does not replace the file input while selecting a PDF', async ({ page }) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...args) => {
      const request = open(...args);
      let callback;
      Object.defineProperty(request, 'onsuccess', {
        get: () => callback,
        set: value => {
          callback = value;
          request.addEventListener('success', event => setTimeout(() => value.call(request, event), 400));
        }
      });
      return request;
    };
  });
  await uploadPDF(page);
  await expect(page.locator('#page-text')).toContainText('pagina uno');
});

test('book reader supports integrated immersive reading and zoom',async({page})=>{await uploadPDF(page);await page.getByRole('button',{name:'Lectura inmersiva',exact:true}).click();await expect(page.locator('.navigation')).toBeHidden();await expect(page.locator('#pdf-canvas')).toBeVisible();await page.getByLabel('Tamaño de lectura',{exact:true}).selectOption('1.5');await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');await page.getByRole('button',{name:'Salir de lectura inmersiva',exact:true}).click();await expect(page.locator('.navigation')).toBeVisible();await page.getByRole('link',{name:'Recetario',exact:true}).click();await expect(page.locator('body')).not.toHaveClass(/reader-focus/);});
