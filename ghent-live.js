// Live solar geometry + weather for Ghent. Used for on-page debug readouts;
// not yet wired into the LED frame.

import SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/+esm';

export const GHENT_LAT = 51.0543;
export const GHENT_LON = 3.7174;

// compassDeg: 0=N, 90=E, 180=S, 270=W.
// altitudeDeg: degrees above horizon, negative at night.
export function getSunPosition(date = new Date()) {
    const { azimuth, altitude } = SunCalc.getPosition(date, GHENT_LAT, GHENT_LON);
    return {
        compassDeg: (azimuth * 180 / Math.PI + 180 + 360) % 360,
        altitudeDeg: altitude * 180 / Math.PI,
    };
}

// Cloud cover percent (0..100) from Open-Meteo. Free, no API key.
export async function getCloudCover() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${GHENT_LAT}&longitude=${GHENT_LON}&current=cloud_cover`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    return data.current.cloud_cover;
}
