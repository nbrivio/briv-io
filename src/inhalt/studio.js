import { z } from 'astro/zod';
import roh from '../../inhalt/studio.json';
import { istLive } from './stufe.js';

// Eine Quelle für Name, Person und Kontakt: Kopf, Fuss, Impressum und strukturierte Daten lesen hier.
// Adresse und Mail dürfen auf der Testadresse fehlen. Für die richtige Adresse sind sie Pflicht.
const schema = z.object({
  name: z.string().min(1),
  claim: z.string().min(1),
  person: z.string().min(1),
  land: z.string().length(2),
  strasse: z.string().min(1).nullable(),
  plz: z.string().regex(/^\d{4}$/).nullable(),
  ort: z.string().min(1).nullable(),
  email: z.email().nullable(),
});

export const studio = schema.parse(roh);

const fehlt = ['strasse', 'plz', 'ort', 'email'].filter((feld) => !studio[feld]);
if (istLive && fehlt.length > 0) {
  throw new Error(`Angaben zum Studio fehlen (inhalt/studio.json): ${fehlt.join(', ')}`);
}

/** Vollständige Postadresse oder null, solange sie nicht eingetragen ist. */
export const anschrift = studio.strasse && studio.plz && studio.ort ? { strasse: studio.strasse, plz: studio.plz, ort: studio.ort } : null;
