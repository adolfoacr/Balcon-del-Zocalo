import { test, expect } from '@playwright/test';
import { standaloneOnly, mockPublicSite } from './standalone-helper.js';

let unexpectedResources;
test.beforeEach(async ({ page }, info) => {
  unexpectedResources = info.project.metadata.standalone ? await standaloneOnly(page) : (await mockPublicSite(page),null);
});
test.afterEach(() => {
  if (unexpectedResources) expect(unexpectedResources, 'The self-contained HTML must not request companion files').toEqual([]);
});

function samplePDF() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  for (const [index, text] of [[3,'Prueba del lector - pagina uno'],[5,'Prueba del lector - pagina dos']]) {
    const stream = `BT /F1 18 Tf 30 440 Td (${text}) Tj ET`;
    objects[index] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  }
  let pdf = '%PDF-1.4\n', offsets = [0];
  for (const [i,obj] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map(x => `${String(x).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf);
}
async function uploadPDF(page) {
  await page.goto('/#libro');
  await page.locator('#book-file').setInputFiles({ name:'Libro de prueba.pdf', mimeType:'application/pdf', buffer:samplePDF() });
  await expect(page.locator('#reader-status')).toHaveText('Página 1 de 2');
}

test('navigation, editorial detail, and responsive layout', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'El origen de lo que sigue.' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 27)');
  await expect(page.getByRole('link', { name:'Noticias', exact:true })).toHaveAttribute('aria-current','page');
  await page.getByRole('button', { name:/Del ingrediente a la investigación/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Texto editorial de demostración');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name:/Explorar el recetario/ }).click();
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
  await expect(page.getByRole('heading',{ name:'Un lugar para cada página.' })).toBeVisible();
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
  await expect(page.getByRole('heading',{ name:'Un lugar para cada página.' })).toBeVisible();
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
