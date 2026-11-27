import { z } from 'astro/zod';
import roh from '../../inhalt/karten.json';
import { istLive } from './stufe.js';

// Die Karten des Decks in der Reihenfolge, in der sie beim Scrollen auf den Tisch kommen.
// «text» ist die Beschriftung der Karte. Er dient als Alt-Text, damit die Karte auch ohne Bild gelesen werden kann.
// Mit «rueckseite» lässt sich die Karte wenden. Mit «adresse» führt sie zur Website des Projekts.
// Die Rückseite einer Projektkarte: was das Projekt ist, was Nicolas daran gemacht hat und wie weit es ist.
const rueckseite = z.object({ was: z.string().min(20).max(120), gemacht: z.string().min(20).max(120), stand: z.string().min(3).max(30).optional() });

const schema = z.object({
  // Solange hier false steht, sind die Texte der Rückseiten Entwürfe. Für die Stufe «live» müssen sie freigegeben sein.
  rueckseitenFreigegeben: z.boolean(),
  karten: z
    .array(z.object({ datei: z.string().regex(/^[A-Za-z0-9-]+$/), art: z.enum(['Titel', 'Projekt', 'Satz']), text: z.string().min(5).max(120), adresse: z.url().startsWith('https://').optional(), rueckseite: rueckseite.optional() }))
    .min(2),
});

const bilder = import.meta.glob('../assets/bilder/karten/*.{png,webp,avif,jpg}', { eager: true, import: 'default' });

const daten = schema.parse(roh);
if (istLive && !daten.rueckseitenFreigegeben) {
  throw new Error('Die Texte der Kartenrückseiten sind noch nicht freigegeben (inhalt/karten.json).');
}

export const karten = daten.karten.map((karte, i) => {
  const treffer = Object.entries(bilder).find(([pfad]) => pfad.split('/').pop().replace(/\.\w+$/, '') === karte.datei);
  if (!treffer) throw new Error(`Karte fehlt unter src/assets/bilder/karten/: ${karte.datei}`);
  return { ...karte, bild: treffer[1], nummer: String(i + 1).padStart(2, '0'), name: karte.text.split('.')[0], kennung: karte.datei.slice(0, 3).replace(/^([A-Z])(\d+)$/, '$1-$2') };
});
