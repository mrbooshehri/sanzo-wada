import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./icon.svg');

const sizes = [
  ['favicon-16.png',  16],
  ['favicon-32.png',  32],
  ['favicon-180.png', 180],  // apple-touch-icon
  ['favicon-192.png', 192],  // manifest / android chrome
  ['favicon-512.png', 512],  // manifest splash
];

await Promise.all(
  sizes.map(([name, size]) =>
    sharp(svg).resize(size, size).png().toFile(name)
  )
);

console.log('Favicon assets generated.');
