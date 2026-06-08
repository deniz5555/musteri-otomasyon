import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../client/public');

const faviconSvg = readFileSync(join(__dirname, 'favicon.svg'));
const ogSvg = readFileSync(join(__dirname, 'og-image.svg'));

console.log('Generating assets...');

await sharp(faviconSvg).resize(32, 32).toFile(join(publicDir, 'favicon-32.png'));
await sharp(faviconSvg).resize(192, 192).toFile(join(publicDir, 'icon-192.png'));
await sharp(faviconSvg).resize(512, 512).toFile(join(publicDir, 'icon-512.png'));
await sharp(ogSvg).resize(1200, 630).toFile(join(publicDir, 'og-image.png'));

console.log('Done:');
console.log('  client/public/favicon-32.png');
console.log('  client/public/icon-192.png');
console.log('  client/public/icon-512.png');
console.log('  client/public/og-image.png');
