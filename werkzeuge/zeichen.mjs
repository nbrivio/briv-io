// Stellt das Zeichen frei: Der dunkle Grund der Vorlage wird durchsichtig, damit es auf jeder Fläche steht.
// Läuft nur, wenn die Vorlage wechselt: node werkzeuge/zeichen.mjs
import sharp from 'sharp';

const vorlage = 'src/assets/marke/briv-io-schwalben.png';
const { data, info } = await sharp(vorlage).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const frei = Buffer.alloc(info.width * info.height * 4);
// Unter der unteren Schwelle gilt ein Punkt als Grund, über der oberen als Zeichen. Dazwischen läuft die Kante weich aus.
// Die Farben bleiben, wie sie sind. Umriss und Schrift der Vorlage sind fast schwarz und werden damit durchsichtig:
// Sie nehmen die Farbe der Fläche an, auf der das Zeichen steht.
const UNTEN = 84;
const OBEN = 124;
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const hell = Math.max(data[i], data[i + 1], data[i + 2]);
  const deckung = Math.min(1, Math.max(0, (hell - UNTEN) / (OBEN - UNTEN)));
  frei[j] = data[i];
  frei[j + 1] = data[i + 1];
  frei[j + 2] = data[i + 2];
  frei[j + 3] = Math.round(deckung * 255);
}
await sharp(frei, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .png({ compressionLevel: 9 })
  .toFile('src/assets/marke/briv-io-zeichen.png');
console.log('✓ Zeichen freigestellt: src/assets/marke/briv-io-zeichen.png');
