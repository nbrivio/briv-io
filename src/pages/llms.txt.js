// Kurze, sachliche Beschreibung für Assistenten. Alles stammt aus denselben Inhaltsdateien wie die Seiten.
import { studio } from '../inhalt/studio.js';
import { projekte } from '../inhalt/projekte.js';
import { texte } from '../inhalt/texte.js';
import { pfad } from '../inhalt/pfad.js';

export function GET({ site }) {
  const voll = (ziel) => new URL(pfad(ziel), site).href;
  const zeilen = [
    `# ${studio.name}`,
    '',
    `> ${studio.name} ist das unabhängige Product Studio von ${studio.person} in der Schweiz. Die Website zeigt Ideen, Experimente und Produkte. Bei jedem Projekt steht, ob es ein Konzept, ein Experiment, in Arbeit oder live ist.`,
    '',
    '## Projekte',
    '',
    ...projekte.map((p) => (p.bereit ? `- [${p.name}](${voll(`/projekte/${p.id}/`)}): ${p.zweck} (${p.art}, ${p.status})` : `- ${p.name}: in Vorbereitung`)),
    '',
    '## Studio',
    '',
    `- [Studio](${voll('/studio/')}): ${texte.studio.tuerText}`,
    ...(studio.email ? [`- Kontakt: ${studio.email}`] : []),
    '',
    '## Weitere Seiten',
    '',
    `- [Startseite](${voll('/')})`,
    `- [Impressum](${voll('/impressum/')})`,
    `- [Datenschutz](${voll('/datenschutz/')})`,
    '',
  ];
  return new Response(zeilen.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
