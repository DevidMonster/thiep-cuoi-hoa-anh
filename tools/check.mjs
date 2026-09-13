import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids');
let checked = 0;
for (const [, link] of html.matchAll(/(?:src|href|data-photo)="([^"]+)"/g)) {
  if (/^(https?:|data:)/.test(link)) continue;
  if (link.startsWith('#')) { if (link.length > 1) assert(ids.includes(link.slice(1)), `Broken anchor ${link}`); continue; }
  await access(resolve(root, link)); checked++;
}
assert.equal(new Date('2026-09-20T14:30:00+07:00').toISOString(), '2026-09-20T07:30:00.000Z');
const calendar = await readFile(resolve(root, 'assets/le-cuoi.ics'), 'utf8');
assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 2);
assert(calendar.includes('DTSTART:20260920T100000Z'));
const settings = { window: {} };
vm.runInNewContext(await readFile(resolve(root, 'config.js'), 'utf8'), settings);
await access(resolve(root, settings.window.WEDDING_CONFIG.giftQrSrc));
console.log(`PASS: ${checked} local assets, configured QR, unique IDs, section links, Vietnam timezone and two calendar events.`);
