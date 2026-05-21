# phosgent

A WLED daylight simulator for a 3D printed model of Ghent.

I generated the printable tiles of the city at **[print-gent.mateovandamme.com](https://print-gent.mateovandamme.com/)**, printed them, assembled the model, and wrapped it in an addressable LED frame. 

The code in this repo is what drives those LEDs, sweeping sun position and daylight color across the surface in real time so the model lights up the way the actual city would at any given moment.

## Connecting to the WLED

At home `phosgent.local` works. At 0x20 hackerspace the network blocks mDNS, so I connect to the WLED directly via its IP instead: `10.51.1.186` (MAC `24:EC:4A:CE:3B:C0`).

---
License:
[CC BY-NC-SA 4.0]