import { z } from 'astro/zod';
import roh from '../../inhalt/karten.json';

// Die Karten des Decks in der Reihenfolge, in der sie beim Scrollen auf den Tisch kommen.
// «text» ist die Beschriftung der Karte. Er dient als Alt-Text, damit die Karte auch ohne Bild gelesen werden kann.
// Mit «adresse» führt die Karte zur Website des Projekts. Ohne sie ist sie nur Bild.
const schema = z.object({
  karten: z
    .array(z.object({ datei: z.string().regex(/^[A-Za-z0-9-]+$/), art: z.enum(['Titel', 'Projekt', 'Satz']), text: z.string().min(5).max(120), adresse: z.url().startsWith('https://').optional() }))
    .min(2),
});

const bilder = import.meta.glob('../assets/bilder/karten/*.{png,webp,avif,jpg}', { eager: true, import: 'default' });

export const karten = schema.parse(roh).karten.map((karte, i) => {
  const treffer = Object.entries(bilder).find(([pfad]) => pfad.split('/').pop().replace(/\.\w+$/, '') === karte.datei);
  if (!treffer) throw new Error(`Karte fehlt unter src/assets/bilder/karten/: ${karte.datei}`);
  return { ...karte, bild: treffer[1], nummer: String(i + 1).padStart(2, '0'), name: karte.text.split('.')[0] };
});
