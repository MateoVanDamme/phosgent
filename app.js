import { buildFrame, sunState } from './sun-model.js';
import { sendFrame, turnOff } from './wled.js';

const $ = (id) => document.getElementById(id);

const wledIp   = $('wledIp');
const ledCount = $('ledCount');
const litCount = $('litCount');
const hour     = $('hour');
const sunWidth = $('sunWidth');
const ambient  = $('ambient');
const duration = $('duration');
const preview  = $('preview');
const statusEl = $('status');

const labels = {
    hour:     $('hourLabel'),
    sunWidth: $('sunWidthLabel'),
    ambient:  $('ambientLabel'),
    sunAngle: $('sunAngleLabel'),
};

let animTimer = null;
let inFlight = false;
let pendingSend = false;

function frameParams() {
    return {
        n:         parseInt(ledCount.value, 10) || 116,
        W:         preview.width,
        H:         preview.height,
        hourValue: parseFloat(hour.value),
        sigma:     parseFloat(sunWidth.value),
        ambient:   parseInt(ambient.value, 10),
    };
}

// Paint the LED ring + the sun's red dot onto the preview canvas. The canvas
// is intentionally tiny (e.g. 32×32) and scaled up by CSS with pixelated
// rendering, so each LED is a single pixel on the perimeter.
function renderPreview({ colors, sunX, sunY }) {
    const ctx = preview.getContext('2d');
    const W = preview.width, H = preview.height;
    const n = colors.length;

    ctx.clearRect(0, 0, W, H);

    const peri = 2 * (W - 1) + 2 * (H - 1);
    const data = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < peri; i++) {
        let d = i;
        let x, y;
        if (d < H - 1)                 { x = 0;       y = d; }
        else if ((d -= H - 1) < W - 1) { x = d;       y = H - 1; }
        else if ((d -= W - 1) < H - 1) { x = W - 1;   y = (H - 1) - d; }
        else                           { d -= H - 1; x = (W - 1) - d; y = 0; }

        const ledIdx = Math.min(n - 1, Math.floor((i / peri) * n));
        const [r, g, b] = colors[ledIdx];
        const off = (y * W + x) * 4;
        data.data[off]     = Math.round(r);
        data.data[off + 1] = Math.round(g);
        data.data[off + 2] = Math.round(b);
        data.data[off + 3] = 255;
    }

    // Clock-style hand: red line from canvas center to the sun's position.
    drawLine(data.data, W, H, (W - 1) / 2, (H - 1) / 2, sunX, sunY, 255, 0, 0);
    ctx.putImageData(data, 0, 0);
}

// Bresenham line into raw imageData. Stays inside the W×H bounds.
function drawLine(buf, W, H, x0, y0, x1, y1, r, g, b) {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x);
    const dy = Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx - dy;
    for (;;) {
        if (x >= 0 && x < W && y >= 0 && y < H) {
            const off = (y * W + x) * 4;
            buf[off] = r; buf[off + 1] = g; buf[off + 2] = b; buf[off + 3] = 255;
        }
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 <  dx) { err += dx; y += sy; }
    }
}

function sendCurrent() {
    if (inFlight) { pendingSend = true; return; }
    const ip = wledIp.value.trim();
    if (!ip) { statusEl.textContent = 'no IP'; return; }
    inFlight = true;
    const { colors } = buildFrame(frameParams());
    sendFrame(ip, colors)
        .then(() => { statusEl.textContent = `sent @ ${(+hour.value).toFixed(1)}h`; })
        .catch(err => { statusEl.textContent = 'error: ' + err.message; })
        .finally(() => {
            inFlight = false;
            if (pendingSend) { pendingSend = false; sendCurrent(); }
        });
}

function updateLabels() {
    labels.hour.textContent     = (+hour.value).toFixed(1);
    labels.sunWidth.textContent = (+sunWidth.value).toFixed(1);
    labels.ambient.textContent  = ambient.value;
    labels.sunAngle.textContent = Math.round(sunState(parseFloat(hour.value)).θdeg);
}

function refresh() {
    updateLabels();
    renderPreview(buildFrame(frameParams()));
}

function refreshAndSend() {
    refresh();
    sendCurrent();
}

function stopAnim() {
    if (!animTimer) return;
    clearInterval(animTimer);
    animTimer = null;
    $('animateBtn').textContent = 'Start sweep';
    $('animateBtn').classList.replace('btn-danger', 'btn-success');
}

function startAnim() {
    const dur = Math.max(1, parseFloat(duration.value)) * 1000;
    const fps = 15;
    const tick = 1000 / fps;
    const start = performance.now();
    animTimer = setInterval(() => {
        const t = ((performance.now() - start) % dur) / dur; // 0..1
        hour.value = (t * 24).toFixed(2);
        refresh();
        sendCurrent();
    }, tick);
    $('animateBtn').textContent = 'Stop sweep';
    $('animateBtn').classList.replace('btn-success', 'btn-danger');
}

['input', 'change'].forEach(ev => {
    [hour, sunWidth, ambient, ledCount, litCount]
        .forEach(el => el.addEventListener(ev, refreshAndSend));
});

$('animateBtn').addEventListener('click', () => {
    if (animTimer) stopAnim(); else startAnim();
});

$('offBtn').addEventListener('click', () => {
    stopAnim();
    const ip = wledIp.value.trim();
    if (!ip) return;
    turnOff(ip)
        .then(() => { statusEl.textContent = 'off'; })
        .catch(err => { statusEl.textContent = 'error: ' + err.message; });
});

refresh();
