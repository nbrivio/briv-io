import { z } from 'astro/zod';
import roh from '../../inhalt/texte.json';
import { istLive } from './stufe.js';

// Texte der Startseite, der Studio-Seite und der Rechtsseiten. Jede Seite hat eigenen Titel und eigene Beschreibung.
const titel = z.string().min(1).max(60).refine((t) => !/\.\*?$/.test(t), 'Titel enden ohne Punkt.');
const kopf = { seitentitel: z.string().min(10).max(50), beschreibung: z.string().min(30).max(160) };
const teile = z.array(z.object({ titel, text: z.array(z.string().min(1)).min(1) })).min(1);

const schema = z.object({
  freigegeben: z.boolean(),
  start: z.object({
    ...kopf,
    lead: z.string().min(10).max(60),
    hinweis: z.string().includes('{anzahl}'),
    vorbereitung: z.string().min(10).max(60),
    studioTitel: titel,
    studioText: z.string().min(40).max(360),
  }),
  studio: z.object({ ...kopf, titel, leitsatz: z.string().min(5).max(60), lead: z.string().min(20).max(200), teile, tuerTitel: titel, tuerText: z.string().min(10).max(200) }),
  impressum: z.object({ ...kopf, titel, teile }),
  datenschutz: z.object({ ...kopf, titel, stand: z.string().regex(/^\d{1,2}\. [A-Z][a-zä]{2}\. \d{2}$/, 'Datum als TT. Mon. JJ'), teile }),
});

export const texte = schema.parse(roh);

if (istLive && !texte.freigegeben) {
  throw new Error('Die Texte sind noch nicht freigegeben (inhalt/texte.json).');
}

/** Zerlegt «Ein *betontes* Wort» in Stücke, damit die Seite die betonte Stelle kursiv setzen kann. */
export function betont(text) {
  return text.split('*').map((stueck, i) => ({ stueck, kursiv: i % 2 === 1 }));
}

const zahlwort = ['null', 'einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
/** «7» wird «sieben», darüber bleibt die Ziffer. */
export const inWorten = (zahl) => zahlwort[zahl] ?? String(zahl);
