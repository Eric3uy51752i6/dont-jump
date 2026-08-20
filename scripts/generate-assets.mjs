import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

await Promise.all([
  sharp('assets/icons/icon-master.svg').resize(192, 192).png().toFile('assets/icons/icon-192.png'),
  sharp('assets/icons/icon-master.svg').resize(512, 512).png().toFile('assets/icons/icon-512.png'),
  sharp('assets/icons/icon-master.svg').resize(180, 180).png().toFile('assets/icons/apple-touch-icon.png'),
  sharp('assets/social/dont-jump-social.svg').resize(1200, 630).png().toFile('assets/social/dont-jump-social.png')
]);

console.log('Generated DON’T JUMP icon and social assets.');
