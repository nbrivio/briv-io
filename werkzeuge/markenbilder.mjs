// Zeichnet Vorschaubild, Favicon und Touch-Icon.
// Die Schrift wird in Pfade gewandelt, damit das Ergebnis auf jeder Maschine gleich aussieht.
// Läuft nur bei Bedarf: npm run markenbilder. Die gezeichnete Marke ersetzt die gesetzte später.
import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const lade = (datei) => opentype.parse(new Uint8Array(readFileSync(new URL(`./schriften/${datei}`, import.meta.url))).buffer);
const titel = lade('bricolage-grotesque-latin-600-normal.woff');

const TINTE = '#103f32';
const PAPIER = '#f4ebd5';
const GOLD = '#ffb319';

// Vorschaubild 1200 auf 630: die Titelkarte auf dem grünen Tisch, daneben zwei Karten des Decks.
{
  const karte = (datei, hoehe) => sharp(`src/assets/bilder/karten/${datei}.png`).resize({ height: hoehe }).toBuffer();
  const dreh = async (bild, grad) => sharp(bild).rotate(grad, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const mitte = await karte('00-the-infinite-deck', 540);
  const links = await dreh(await karte('P01-ryse', 400), -9);
  const rechts = await dreh(await karte('S04-make-things', 400), 8);
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#103f32' } })
    .composite([
      { input: links, top: 110, left: 170 },
      { input: rechts, top: 105, left: 720 },
      { input: mitte, top: 45, left: 398 },
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
