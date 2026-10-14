import { build, transform } from 'esbuild';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { validateServiceConfig } from '../web/service.js';
import { newsMarkup, esc } from '../web/markup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfRoot = path.join(root, 'node_modules/pdfjs-dist');
const content = JSON.parse(await readFile(path.join(root, 'Sources/Resources/content.json'), 'utf8'));
const serviceConfig=validateServiceConfig(JSON.parse(await readFile(path.join(root, 'web/service-config.json'),'utf8')));
const binary = {};
const licenses = { 'Questrial/OFL.txt': await readFile(path.join(root, 'web/assets/Questrial-OFL.txt'), 'utf8') };
for (const folder of ['', 'cmaps', 'standard_fonts', 'wasm']) {
  for (const name of (await readdir(path.join(pdfRoot, folder))).sort()) {
    if (/^(LICENSE|COPYING|NOTICE)/.test(name)) licenses[path.join(folder, name)] = await readFile(path.join(pdfRoot, folder, name), 'utf8');
  }
}
for (const [kind, folder] of [['cMapUrl', 'cmaps'], ['standardFontDataUrl', 'standard_fonts'], ['wasmUrl', 'wasm']]) {
  for (const name of (await readdir(path.join(pdfRoot, folder))).sort()) {
    if (!/\.(bcmap|ttf|pfb|wasm)$/.test(name)) continue;
    binary[`${kind}/${name}`] = (await readFile(path.join(pdfRoot, folder, name))).toString('base64');
  }
}
const worker = await transform(await readFile(path.join(pdfRoot, 'legacy/build/pdf.worker.mjs'), 'utf8'), {
  minify: true, target: 'es2022', format: 'esm', legalComments: 'inline'
});
const standaloneRuntime = `
let module, workerURL;
const resources = ${JSON.stringify(binary)};
class EmbeddedBinaryDataFactory {
  async fetch({ kind, filename }) {
    const encoded = resources[kind + '/' + filename];
    if (!encoded) throw new Error('Recurso PDF no disponible: ' + filename);
    return Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  }
}
export const pdfDocumentOptions = {
  useWorkerFetch: false, BinaryDataFactory: EmbeddedBinaryDataFactory, cMapPacked: true
};
export async function getPdfModule() {
  if (!module) {
    // The official compatibility build includes utilities needed by older Safari.
    module = await import('pdfjs-dist/legacy/build/pdf.mjs');
    workerURL = URL.createObjectURL(new Blob([${JSON.stringify(worker.code)}], { type: 'text/javascript' }));
    module.GlobalWorkerOptions.workerSrc = workerURL;
  }
  return module;
}
`;
const output = await build({
  entryPoints: [path.join(root, 'web/app.js')],
  bundle: true, write: false, minify: true, format: 'iife', platform: 'browser',
  target: ['safari17', 'chrome120'], legalComments: 'inline',
  plugins: [{
    name: 'embedded-pdf',
    setup(plugin) {
      plugin.onResolve({ filter: /(^|\/)pdf-runtime\.js$/ }, () => ({ path: 'embedded-pdf', namespace: 'embedded' }));
      plugin.onLoad({ filter: /.*/, namespace: 'embedded' }, () => ({ contents: standaloneRuntime, loader: 'js', resolveDir: root }));
    }
  }]
});
const script = output.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
new Script(script, { filename: 'pilot-inline.js' });
const json = JSON.stringify(content).replace(/</g, '\\u003c');
const notices = JSON.stringify(licenses).replace(/</g, '\\u003c');
let css = (await readFile(path.join(root, 'web/styles.css'), 'utf8')).replace(/@import[^;]+;/g, '');
const fallback = `<noscript><section id="recetario" class="intro"><span class="eyebrow">Recetario</span><h1>Sabores por descubrir.</h1><p>Platos de muestra pendientes de confirmar con el restaurante.</p></section><section class="cards">${content.recipes.map(recipe => `<article class="dish-card"><div class="dish-content"><span class="eyebrow">${esc(recipe.category)}</span><h3>${esc(recipe.name)}</h3><p>${esc(recipe.description)}</p><ul>${recipe.ingredients.map(ingredient => `<li>${esc(ingredient)}</li>`).join('')}</ul></div></article>`).join('')}</section><section id="libro" class="intro"><span class="eyebrow">Nuestro libro</span><h2>Un lugar para cada página.</h2><p>El libro está pendiente de que lo compartas.</p></section><p class="notice">Esta vista permite revisar el diseño. Para usar búsqueda, favoritos y el lector, abre el archivo descargado en un navegador que permita ejecutar la aplicación.</p></noscript>`;
const assetTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const assetURLs = new Map();
for (const name of await readdir(path.join(root, 'web/assets'))) {
  const mime = assetTypes[path.extname(name)];
  if (!mime) continue;
  assetURLs.set(`/assets/${name}`, `data:${mime};base64,${(await readFile(path.join(root, 'web/assets', name))).toString('base64')}`);
}
for (const [url, embedded] of assetURLs) css = css.replaceAll(url, () => embedded);
let html = await readFile(path.join(root, 'web/index.html'), 'utf8');
for (const [url, embedded] of assetURLs) html = html.replaceAll(url, () => embedded);
html = html.replace('  <link rel="stylesheet" href="/styles.css">', () => `  <style>${css}</style>`)
  .replace('  <script type="module" src="/app.js"></script>', '')
  .replace('<p class="loading">Preparando tu experiencia…</p>', () => newsMarkup(content) + fallback)
  .replace('</body>', () => `<script type="application/json" id="pilot-content">${json}</script>\n<script type="application/json" id="service-config">${JSON.stringify(serviceConfig).replace(/</g, "\\u003c")}</script>\n<script type="application/json" id="third-party-notices">${notices}</script>\n<script>${script}</script>\n</body>`);
// Check the final HTML as well: replacement strings must not expand $& or $` from dependencies.
new Script(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')));
await writeFile(path.join(root, 'index.html'), html);
console.log(`Piloto autocontenido generado: index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB).`);
