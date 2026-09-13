import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Chạy sau khi mở Chrome headless với remote-debugging-port=9223.
const targets = await (await fetch('http://127.0.0.1:9223/json')).json();
const target = targets.find(item => item.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    message.error ? handler.reject(message.error) : handler.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
});
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.readyState === "complete" && !!window.WEDDING_CONFIG')) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Page failed to load');
}
async function screenshot(name, fullPage = false) {
  const metrics = await send('Page.getLayoutMetrics');
  const clip = fullPage ? { x: 0, y: 0, width: metrics.cssContentSize.width, height: metrics.cssContentSize.height, scale: 1 } : undefined;
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
  await writeFile(new URL(`../preview/${name}.png`, import.meta.url), Buffer.from(result.data, 'base64'));
}
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/?to=Gia%20đình%20bạn%20Minh' });
await ready();
await evaluate('document.fonts.ready');
await evaluate('Promise.all(Array.from(document.images).map(image => { image.loading = "eager"; return image.complete ? Promise.resolve() : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; }); }))');
assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Desktop horizontal overflow');
assert.equal(await evaluate('document.getElementById("guest-name").textContent'), 'Gia đình bạn Minh');
assert.equal(await evaluate('Array.from(document.images).filter(image => image.src && !image.naturalWidth).length'), 0, 'Broken image');
await screenshot('desktop', true);

await evaluate('document.querySelector(".gallery-item").click()');
assert.equal(await evaluate('document.getElementById("photo-dialog").open'), true);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
assert.equal(await evaluate('document.getElementById("photo-counter").textContent'), '2 / 6');
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
assert.equal(await evaluate('document.getElementById("photo-dialog").open'), false);
await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
assert.equal(await evaluate('document.body.classList.contains("modal-open")'), false);

assert.equal(await evaluate('document.getElementById("open-gift").hidden'), false);
await evaluate('document.getElementById("open-gift").click()');
assert.equal(await evaluate('document.getElementById("gift-dialog").open'), true);
assert.equal(await evaluate('document.getElementById("gift-qr").naturalWidth'), 734);
assert.match(await evaluate('document.getElementById("download-qr").href'), /qr-mung-cuoi\.jpg$/);
await screenshot('qr-dialog');
await evaluate('document.getElementById("gift-dialog").close()');

for (const width of [390, 320, 768]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}px`);
  if (width === 390) await screenshot('mobile', true);
}
await evaluate('Date.now = () => new Date("2026-09-21T00:00:00+07:00").getTime(); updateCountdown()');
assert.equal(await evaluate('document.getElementById("days").textContent'), '00');
assert.match(await evaluate('document.getElementById("countdown-caption").textContent'), /đã đến/);
assert.deepEqual(errors, []);
console.log('PASS: desktop and 320/390/768px layouts, all images, guest name, album navigation, Escape, QR modal/download, expired countdown, no browser exceptions.');
socket.close();
