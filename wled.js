// WLED HTTP API communication.

const toHex = (v) => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16).padStart(2, '0').toUpperCase();

const rgbHex = (r, g, b) => toHex(r) + toHex(g) + toHex(b);

function frameToHex(frame) {
    const out = new Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
        const [r, g, b] = frame[i];
        out[i] = rgbHex(r, g, b);
    }
    return out;
}

function postState(ip, body) {
    return fetch(`http://${ip}/json/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(t || res.statusText); });
        return res.text();
    });
}

// The strip is wound the opposite way around the physical model from how the
// renderer lays LEDs out (clockwise compass bearings), so reverse before send.
const STRIP_REVERSED = true;

// Rotational offset (in LEDs) applied after reversal, to align the strip's
// physical "top" with the renderer's "north". Tune visually: nudge until the
// midnight train (hour 0) sits at the top of the model.
const STRIP_OFFSET = 29;

export function sendFrame(ip, colors) {
    let ordered = STRIP_REVERSED ? [...colors].reverse() : [...colors];
    if (STRIP_OFFSET !== 0) {
        const k = ((STRIP_OFFSET % ordered.length) + ordered.length) % ordered.length;
        ordered = ordered.slice(k).concat(ordered.slice(0, k));
    }
    return postState(ip, {
        on: true,
        bri: 255,
        seg: [{ id: 0, i: frameToHex(ordered) }],
    });
}

export function turnOff(ip) {
    return postState(ip, { on: false });
}
