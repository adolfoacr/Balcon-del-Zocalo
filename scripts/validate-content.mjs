import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../Sources/Resources/content.json', import.meta.url)));
assert.equal(data.schemaVersion, 1);
const ids = new Set();
for (const item of [...data.news, ...data.recipes, ...data.book.chapters]) {
  assert(item.id && !ids.has(item.id), 'Every item needs a unique stable ID'); ids.add(item.id);
  assert(item.source, `Missing provenance: ${item.id}`);
  assert(['demo', 'pending', 'verified'].includes(item.verification));
  if (item.verification === 'verified') assert(item.sourceURL?.startsWith('https://'), 'Verified content needs an HTTPS source');
}
for (const item of data.news) {
  assert(item.title && item.excerpt && item.body);
  if (item.date !== null) assert(/^\d{4}-\d{2}-\d{2}$/.test(item.date), 'Use absolute dates');
}
for (const item of data.recipes) {
  assert(item.name && item.category && item.ingredients.length && item.description);
  assert(Array.isArray(item.steps));
}
assert.equal(data.book.status, 'awaiting-owner');
assert.equal(data.book.chapters.length, 0, 'Do not invent the owner’s book');
console.log(`Contenido válido: ${data.news.length} guías del piloto, ${data.recipes.length} platos de muestra, libro pendiente.`);
