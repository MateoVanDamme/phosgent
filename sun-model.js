// Pure math + color model for the 24-hour sun simulation.
// No DOM access — takes plain inputs, returns plain data.

const MORNING = [0, 0, 255];
const MIDDAY  = [255, 255, 200];
const EVENING = [255, 0, 0];

const SUN_PEAK = 255;
const SUN_RADIUS_FACTOR = 0.55; // sun circle radius as fraction of half canvas size

function lerp(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

// 24-hour sun model.
// Compass angle θ = hour * 15°: 0=N midnight, 90=E sunrise, 180=S noon, 270=W sunset.
export function sunState(hourValue) {
    const θdeg = ((hourValue * 15) % 360 + 360) % 360;
    const θ = θdeg * Math.PI / 180;
    return {
        θdeg,
        sinθ: Math.sin(θ),
        cosθ: Math.cos(θ),
        intensity: sunIntensity(θdeg),
    };
}

// Peak brightness curve for the LED right at the sun's direction.
function sunIntensity(θdeg) {
    return 1;
}

// Sky color from compass angle. 
function skyColor(θdeg) {
    const θabs = 180 - Math.abs(θdeg - 180);
    // return MIDDAY;
    const [a, b, c] = [60, 90, 160];
    if (θabs < a) return MORNING;
    if (θabs < b) return lerp(MORNING, EVENING,  (θabs - a) / (b - a));
    if (θabs < c) return lerp(EVENING,  MIDDAY, (θabs - b) / (c - b));
    return MIDDAY;
}

// Walk the rectangle perimeter from top-left → down left → across bottom →
// up right → across top. Returns (x, y) for LED index i on a W×H grid.
export function ledPos(i, n, W, H) {
    const peri = 2 * (W - 1) + 2 * (H - 1);
    let d = (i / n) * peri;
    if (d < H - 1)                 return [0, d];
    d -= H - 1;
    if (d < W - 1)                 return [d, H - 1];
    d -= W - 1;
    if (d < H - 1)                 return [W - 1, (H - 1) - d];
    d -= H - 1;
    return [(W - 1) - d, 0];
}

// Compass bearing (0=N, 90=E, 180=S, 270=W) from canvas center to (x, y).
function compassFromCenter(x, y, cx, cy) {
    return ((Math.atan2(x - cx, -(y - cy)) * 180 / Math.PI) + 360) % 360;
}

// Build per-LED colors + sun (x, y) for the given inputs.
//   n         — LED count
//   W, H      — canvas pixel size used to lay LEDs around the perimeter
//   hourValue — 0..24
//   sigma     — sun spread, in LEDs
//   ambient   — 0..255 ambient sky brightness
export function buildFrame({ n, W, H, hourValue, sigma, ambient }) {
    const cx = (W - 1) / 2;
    const cy = (H - 1) / 2;
    const sunR = Math.min(W, H) / 2 * SUN_RADIUS_FACTOR;

    const sun = sunState(hourValue);
    const sunX = cx + sunR * sun.sinθ;
    const sunY = cy - sunR * sun.cosθ;

    // Convert sigma from LEDs along the strip to angular degrees of bearing.
    const sigmaDeg = Math.max(0.5, sigma) * (360 / n);
    const [sr, sg, sb] = skyColor(sun.θdeg);

    const colors = new Array(n);
    for (let i = 0; i < n; i++) {
        const [xL, yL] = ledPos(i, n, W, H);
        const θled = compassFromCenter(xL, yL, cx, cy);
        let Δ = Math.abs(θled - sun.θdeg);
        if (Δ > 180) Δ = 360 - Δ;
        const fall = Math.exp(-(Δ * Δ) / (2 * sigmaDeg * sigmaDeg));
        const t = Math.min(1, (ambient + SUN_PEAK * fall) / 255) * sun.intensity;
        colors[i] = [sr * t, sg * t, sb * t];
    }
    return { colors, sunX, sunY };
}
