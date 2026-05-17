import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./icon.svg');

const sizes = [
  ['mdpi',     48,  108],
  ['hdpi',     72,  162],
  ['xhdpi',    96,  216],
  ['xxhdpi',  144,  324],
  ['xxxhdpi', 192,  432],
];

await Promise.all(sizes.flatMap(([density, size, fgSize]) => {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  return [
    sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher.png`),
    sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`),
    sharp(svg).resize(fgSize, fgSize).png().toFile(`${dir}/ic_launcher_foreground.png`),
  ];
}));

console.log('Launcher icons generated.');
