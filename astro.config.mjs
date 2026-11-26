import { defineConfig } from 'astro/config';
import { execFileSync } from 'node:child_process';
import sitemap from '@astrojs/sitemap';

// Adresse und Unterpfad kommen aus der Umgebung, damit dieselbe Quelle auf der Testadresse
// und auf www.nicolasbrivio.ch läuft.
const site = process.env.SITE_ADRESSE ?? 'https://www.nicolasbrivio.ch';
const base = process.env.SITE_PFAD ?? '/';

// Letzte inhaltliche Änderung je Seite, aus der Versionsgeschichte der Dateien, aus denen sie entsteht.
// So steht in der Sitemap ein ehrliches Datum und nicht der Tag des Neubaus.
const quellen = {
  '/': ['inhalt/texte.json', 'inhalt/projekte.json', 'src/pages/index.astro'],
  '/impressum/': ['inhalt/texte.json', 'inhalt/studio.json', 'src/pages/impressum.astro'],
  '/datenschutz/': ['inhalt/texte.json', 'src/pages/datenschutz.astro'],
};
const kapitel = ['inhalt/projekte.json', 'src/pages/projekte/[id].astro'];
function geaendert(adresse) {
  const pfad = new URL(adresse).pathname.slice(base.replace(/\/$/, '').length) || '/';
  const dateien = quellen[pfad] ?? (pfad.startsWith('/projekte/') ? kapitel : undefined);
  if (!dateien) return undefined;
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', ...dateien], { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ serialize: (eintrag) => ({ ...eintrag, lastmod: geaendert(eintrag.url) }) })],
  security: {
    // GitHub Pages erlaubt keine eigenen Server-Kopfzeilen, deshalb als Meta-Angabe.
    // Stile und Skripte werden beim Bau mit Prüfsummen eingetragen. Die Seite spricht mit keinem Server.
    csp: {
      directives: ["default-src 'none'", "img-src 'self' data:", "font-src 'self'", "manifest-src 'self'", "base-uri 'self'", "form-action 'none'"],
    },
  },
});
