// Zeichnet Vorschaubild, Favicon und Touch-Icon.
// Die Schrift wird in Pfade gewandelt, damit das Ergebnis auf jeder Maschine gleich aussieht.
// Läuft nur bei Bedarf: npm run markenbilder. Die gezeichnete Marke ersetzt die gesetzte später.
import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const lade = (datei) => opentype.parse(new Uint8Array(readFileSync(new URL(`./schriften/${datei}`, import.meta.url))).buffer);
const titel = lade('bricolage-grotesque-latin-600-normal.woff');
const text = lade('instrument-sans-latin-500-normal.woff');

const TINTE = '#191f1b';
const PAPIER = '#f3eddf';
const GOLD = '#ddb34e';

// Vorschaubild 1200 auf 630: das Zeichen auf der Wand, der Claim darunter.
// Der dunkle Grund des Zeichens geht wie auf der Seite in der Wand auf.
{
  const zeichen = await sharp('src/assets/marke/briv-io-schwalben.png').resize({ height: 500 }).toBuffer();
  const claim = 'Built from curiosity.';
  const cBreite = text.getAdvanceWidth(claim, 30);
  const c = text.getPath(claim, (1200 - cBreite) / 2, 585, 30);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><path fill="${PAPIER}" d="${c.toPathData(2)}"/></svg>`;
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#111512' } })
    .composite([
      { input: zeichen, top: 30, left: 225, blend: 'screen' },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile('public/vorschau.jpg');
}

// Favicon und Touch-Icon: das «b» mit dem goldenen Band.
for (const [datei, kante] of [['favicon.png', 96], ['apple-touch-icon.png', 180]]) {
  const groesse = kante * 0.78;
  const bBreite = titel.getAdvanceWidth('b', groesse);
  const band = { w: 0.36 * groesse, h: 0.085 * groesse };
  const x = (kante - bBreite - 0.06 * groesse - band.w) / 2;
  const b = titel.getPath('b', x, kante * 0.74, groesse);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${kante}" height="${kante}">
    <rect width="${kante}" height="${kante}" fill="${TINTE}"/>
    <path fill="${PAPIER}" d="${b.toPathData(2)}"/>
    <rect fill="${GOLD}" x="${x + bBreite + 0.06 * groesse}" y="${kante * 0.74 - 0.3 * groesse}" width="${band.w}" height="${band.h}"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/${datei}`);
}

console.log('✓ Markenbilder: vorschau.jpg, favicon.png, apple-touch-icon.png');
