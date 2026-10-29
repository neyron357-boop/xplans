// Draws the app icon (roots converging on the goal) and renders the PNG sizes phones need.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const art = `
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 120 C 170 136, 290 206, 368 246" stroke="#2c3135" stroke-width="5"/>
    <path d="M40 400 C 170 384, 290 306, 368 266" stroke="#2c3135" stroke-width="5"/>
    <path d="M236 128 C 258 106, 290 94, 330 92" stroke="#5fa6bd" stroke-width="5" opacity=".5"/>
    <path d="M150 168 C 156 146, 166 130, 182 116" stroke="#5fa6bd" stroke-width="5" opacity=".5"/>
    <path d="M262 330 C 286 350, 316 358, 350 360" stroke="#5fa6bd" stroke-width="5" opacity=".5"/>
    <path d="M96 256 C 128 190, 170 132, 236 128 C 300 124, 346 160, 364 208 C 370 226, 374 242, 376 250" stroke="#5fa6bd" stroke-width="12"/>
    <path d="M96 256 C 140 300, 200 330, 262 330 C 314 330, 350 312, 364 290 C 370 280, 374 270, 376 262" stroke="#5fa6bd" stroke-width="12"/>
    <path d="M96 256 C 170 240, 236 276, 300 256 S 352 248, 370 256" stroke="#e8a85c" stroke-width="16"/>
  </g>
  <circle cx="404" cy="256" r="46" fill="none" stroke="#e8a85c" stroke-width="6" opacity=".4"/>
  <circle cx="404" cy="256" r="30" fill="#e8a85c"/>
  <circle cx="96" cy="256" r="16" fill="#e6e3dc"/>`;

const svg = (radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="#121416"/>${art}</svg>`;

const png = (source, size, file) =>
  writeFileSync(file, new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng());

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon.svg', svg(112));
png(svg(112), 192, 'public/icons/icon-192.png');
png(svg(112), 512, 'public/icons/icon-512.png');
png(svg(0), 512, 'public/icons/maskable-512.png');
png(svg(0), 180, 'public/icons/apple-touch-icon.png');
