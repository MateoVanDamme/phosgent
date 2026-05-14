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

export function sendFrame(ip, colors) {
    return postState(ip, {
        on: true,
        seg: [{ id: 0, i: frameToHex(colors) }],
    });
}

export function turnOff(ip) {
    return postState(ip, { on: false });
}
