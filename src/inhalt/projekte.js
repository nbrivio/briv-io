import { z } from 'astro/zod';
import roh from '../../inhalt/projekte.json';
import { istLive } from './stufe.js';

// Die Kapitel der Ausstellung, in der Reihenfolge der Datei.
// Ein Kapitel mit «bereit: false» ist angekündigt: Es steht mit Namen in der Ausstellung, hat aber noch keine eigene Seite.
const titel = z.string().min(1).max(60).refine((t) => !/\.\*?$/.test(t), 'Titel enden ohne Punkt.');
const felder = z.enum(['tinte', 'nacht', 'rot', 'burgund', 'blau', 'oliv', 'ocker']);
const kennung = z.string().regex(/^[a-z0-9-]+$/);

const angekuendigt = z.object({ id: kennung, name: z.string().min(1), bereit: z.literal(false), feld: felder });
const fertig = z.object({
  id: kennung,
  name: z.string().min(1),
  bereit: z.literal(true),
  art: z.string().min(1).max(30),
  // Nie so tun, als sei alles lanciert: Jedes Kapitel sagt, was es ist.
  status: z.enum(['Konzept', 'Experiment', 'In Arbeit', 'Live']),
  feld: felder,
  titel,
  zweck: z.string().min(20).max(140),
  frage: z.string().min(20).max(120).refine((t) => t.endsWith('?'), 'Die Frage endet mit einem Fragezeichen.'),
  beschrieb: z.string().min(40).max(360),
  seitentitel: z.string().min(10).max(50),
  beschreibung: z.string().min(50).max(160),
  bild: z.string().optional(),
  bildAlt: z.string().min(10).optional(),
  adresse: z.url().startsWith('https://').optional(),
});

const schema = z.object({
  // Solange hier false steht, sind die Texte Entwürfe: auf der Testadresse geduldet, auf der richtigen Adresse bricht der Bau ab.
  freigegeben: z.boolean(),
  // Mit false zeigt die Seite nur das Titelblatt: keine Projekte auf der Startseite, keine Projektseiten.
  oeffentlich: z.boolean(),
  projekte: z
    .array(z.discriminatedUnion('bereit', [angekuendigt, fertig]))
    .min(1)
    .refine((liste) => new Set(liste.map((p) => p.id)).size === liste.length, 'Jede Kennung kommt nur einmal vor.')
    .refine((liste) => liste.every((p) => !p.bild || p.bildAlt), 'Jedes Bild braucht einen Alt-Text.'),
});

const daten = schema.parse(roh);
if (istLive && daten.oeffentlich && !daten.freigegeben) {
  throw new Error('Die Texte der Kapitel sind noch nicht freigegeben (inhalt/projekte.json).');
}

const bilder = import.meta.glob('../assets/bilder/kapitel/*.{webp,avif,jpg,png}', { eager: true, import: 'default' });
const zweistellig = (zahl) => String(zahl).padStart(2, '0');

const alle = daten.projekte.map((projekt, i) => {
  const datei = projekt.bild ? Object.entries(bilder).find(([pfad]) => pfad.split('/').pop().replace(/\.\w+$/, '') === projekt.bild) : undefined;
  if (projekt.bild && !datei) throw new Error(`Bild fehlt unter src/assets/bilder/kapitel/: ${projekt.bild}`);
  return { ...projekt, nummer: zweistellig(i + 1), bildDatei: datei?.[1] };
});

export const projekte = daten.oeffentlich ? alle : [];
export const anzahl = zweistellig(projekte.length);
export const bereite = projekte.filter((p) => p.bereit);
