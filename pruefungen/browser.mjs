// Durchlauf im echten Browser: jede Seite auf fünf Breiten, ohne Überlauf, ohne Fehler in der Konsole
// (dort melden sich auch Verstösse gegen die Content Security Policy), dazu die Prüfung nach WCAG 2.2 AA
// und ein Tastaturdurchlauf mit sichtbarem Fokus. Dann das Deck selbst und jede Seite ohne JavaScript.
import { relative } from 'node:path';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';
import { dateien, bericht } from './dateien.mjs';
import { starteServer } from './server.mjs';

const breiten = [
  ['kleines Handy', 320, 640],
  ['grosses Handy', 430, 932],
  ['Tablet', 820, 1180],
  ['Laptop', 1366, 768],
  ['grosser Bildschirm', 1920, 1080],
];

const b = bericht('Browser-Durchlauf');
const seiten = (await dateien('dist', '.html')).map((d) => `/${relative('dist', d)}`.replace(/index\.html$/, ''));
const { adresse, schliessen } = await starteServer();
const browser = await chromium.launch({ channel: 'chrome' });

for (const seite of seiten) {
  for (const [name, width, height] of breiten) {
    const ort = `${seite} (${name})`;
    const kontext = await browser.newContext({ viewport: { width, height }, reducedMotion: name === 'Tablet' ? 'reduce' : 'no-preference' });
    const fenster = await kontext.newPage();
    fenster.on('console', (meldung) => meldung.type() === 'error' && !/404 \(Not Found\)/.test(meldung.text()) && b.melde(ort, `Konsole: ${meldung.text()}`));
    fenster.on('pageerror', (fehler) => b.melde(ort, `Skriptfehler: ${fehler.message}`));
    fenster.on('requestfailed', (anfrage) => b.melde(ort, `Abruf gescheitert: ${anfrage.url()}`));
    fenster.on('request', (anfrage) => !anfrage.url().startsWith(adresse) && b.melde(ort, `Abruf nach aussen: ${anfrage.url()}`));

    await fenster.goto(adresse + seite, { waitUntil: 'networkidle' });
    await fenster.evaluate(() => document.fonts.ready);

    const ueberlauf = await fenster.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ueberlauf > 0) b.melde(ort, `horizontaler Überlauf um ${ueberlauf} Pixel`);

    const kaputt = await fenster.evaluate(() => [...document.images].filter((bild) => bild.complete && bild.naturalWidth === 0).map((bild) => bild.currentSrc));
    for (const bild of kaputt) b.melde(ort, `Bild lädt nicht: ${bild}`);

    // Die Prüfung scrollt selbst durch die Seite und träfe sonst Text mitten im Einblenden.
    // Gemessen wird darum der ruhende Zustand, danach gilt wieder die Einstellung der Breite.
    const bewegung = name === 'Tablet' ? 'reduce' : 'no-preference';
    await fenster.emulateMedia({ reducedMotion: 'reduce' });
    const { violations } = await new AxeBuilder({ page: fenster }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    await fenster.emulateMedia({ reducedMotion: bewegung });
    await fenster.evaluate(() => scrollTo(0, 0));
    for (const v of violations) b.melde(ort, `${v.id}: ${v.help} (${v.nodes.length}x, ${v.nodes[0].target.join(' ')})`);

    // Stehende Titel dürfen beim Scrollen nie über Text ihres Abschnitts liegen.
    const ueberlappt = await fenster.evaluate(async () => {
      const funde = new Set();
      const hoehe = document.documentElement.scrollHeight;
      for (let y = 0; y < hoehe; y += 160) {
        scrollTo(0, y);
        await new Promise((weiter) => requestAnimationFrame(weiter));
        for (const titel of document.querySelectorAll('h1, h2')) {
          if (getComputedStyle(titel).position !== 'sticky') continue;
          const t = titel.getBoundingClientRect();
          if (t.width === 0 || t.bottom < 0 || t.top > innerHeight) continue;
          for (const e of titel.closest('section')?.querySelectorAll('p, dt, dd, li, summary, td, th, b, a') ?? []) {
            if (titel.contains(e) || e.contains(titel)) continue;
            const r = e.getBoundingClientRect();
            if (r.width > 0 && r.left < t.right - 2 && r.right > t.left + 2 && r.top < t.bottom - 2 && r.bottom > t.top + 2) funde.add(titel.textContent.trim().slice(0, 40));
          }
        }
      }
      scrollTo(0, 0);
      return [...funde];
    });
    for (const titel of ueberlappt) b.melde(ort, `Titel liegt beim Scrollen über Text: ${titel}`);

    // Tastatur: jedes Ziel erreichbar, Fokus sichtbar und im Bild.
    const ziele = await fenster.locator('a[href], button, input, select, textarea, [tabindex="0"]').count();
    for (let i = 0; i < ziele; i += 1) {
      await fenster.keyboard.press('Tab');
      const fokus = await fenster.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const r = e.getBoundingClientRect();
        const stil = getComputedStyle(e);
        return {
          name: e.textContent.trim().slice(0, 30) || e.getAttribute('aria-label'),
          rahmen: stil.outlineStyle !== 'none' && parseFloat(stil.outlineWidth) >= 2,
          sichtbar: r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
          // Verweise im Fliesstext sind von der Mindestgrösse ausgenommen (WCAG 2.5.8).
          gross: stil.display === 'inline' || (r.width >= 24 && r.height >= 24),
        };
      });
      // Zurück am Seitenanfang: alle sichtbaren Ziele sind durchlaufen.
      if (!fokus) {
        if (i === 0) b.melde(ort, 'Tab erreicht kein Ziel');
        break;
      }
      {
        if (!fokus.rahmen) b.melde(ort, `kein Fokusrahmen: ${fokus.name}`);
        if (!fokus.sichtbar) b.melde(ort, `Fokus ausserhalb des Bildes: ${fokus.name}`);
        if (!fokus.gross) b.melde(ort, `Ziel kleiner als 24 Pixel: ${fokus.name}`);
      }
    }
    await kontext.close();
  }
}

// Deck: Am Ende des Scrollwegs liegen alle Karten sichtbar auf dem Tisch, und nichts läuft über.
for (const [name, width, height] of [breiten[0], breiten[1], breiten[3]]) {
  const ort = `Deck (${name})`;
  const kontext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const fenster = await kontext.newPage();
  fenster.on('pageerror', (fehler) => b.melde(ort, `Skriptfehler: ${fehler.message}`));
  await fenster.goto(`${adresse}/`, { waitUntil: 'networkidle' });
  const amAnfang = await fenster.evaluate(() => [...document.querySelectorAll('.karte')].filter((k) => getComputedStyle(k).visibility === 'visible').length);
  if (amAnfang !== 1) b.melde(ort, `am Anfang liegen ${amAnfang} Karten statt einer`);
  await fenster.evaluate(() => {
    const deck = document.querySelector('.deck');
    scrollTo(0, deck.offsetTop + deck.offsetHeight - innerHeight);
  });
  await fenster.waitForTimeout(400);
  const draussen = await fenster.evaluate(() =>
    [...document.querySelectorAll('.karte')].filter((k) => {
      const r = k.getBoundingClientRect();
      return getComputedStyle(k).visibility !== 'visible' || r.left < -2 || r.top < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2;
    }).length,
  );
  if (draussen > 0) b.melde(ort, `${draussen} Karten liegen am Ende nicht ganz auf dem Tisch`);
  // Wenden: Ein Klick dreht eine Projektkarte und holt sie in die Mitte, Escape legt sie zurück.
  const erste = fenster.locator('.karte .vorn').first();
  await erste.click();
  await fenster.waitForTimeout(300);
  const offen = await fenster.evaluate(() => {
    const karte = document.querySelector('.karte.gewendet');
    if (!karte) return null;
    const r = karte.getBoundingClientRect();
    const verweis = karte.querySelector('.hinten a');
    return { mitte: Math.abs(r.left + r.width / 2 - innerWidth / 2) < 4, im: r.top >= -2 && r.bottom <= innerHeight + 2, fokus: karte.querySelector('.hinten').contains(document.activeElement), verweis: Boolean(verweis) };
  });
  if (!offen) b.melde(ort, 'ein Klick wendet die Karte nicht');
  else {
    if (!offen.mitte || !offen.im) b.melde(ort, 'die gewendete Karte liegt nicht ganz in der Mitte des Schirms');
    if (!offen.fokus) b.melde(ort, 'der Fokus liegt nach dem Wenden nicht auf der Rückseite');
    const zuViel = await fenster.evaluate(() => {
      const h = document.querySelector('.karte.gewendet .hinten');
      const knoepfe = h.querySelector('.h-knoepfe').getBoundingClientRect();
      const letzter = [...h.querySelectorAll('.h-was, .h-gemacht, .h-stand')].at(-1).getBoundingClientRect();
      return letzter.bottom > knoepfe.top + 1;
    });
    if (zuViel) b.melde(ort, 'der Text der Rückseite läuft in die Knöpfe');
  }
  await fenster.keyboard.press('Escape');
  await fenster.waitForTimeout(200);
  if ((await fenster.locator('.karte.gewendet').count()) > 0) b.melde(ort, 'Escape legt die gewendete Karte nicht zurück');
  // Zugabe: Wer am Ende dreimal weiterscrollt, bekommt noch eine Karte. Vorher ist sie nicht da.
  if (await fenster.locator('.zugabe').isVisible()) b.melde(ort, 'die Zugabe liegt schon vor dem Weiterscrollen da');
  // Der erste Druck bringt die Seite sicher ans Ende, die nächsten drei zählen als Versuche.
  for (let i = 0; i < 4; i += 1) {
    await fenster.keyboard.press('End');
    await fenster.waitForTimeout(500);
  }
  if (!(await fenster.locator('.zugabe').isVisible())) b.melde(ort, 'die Zugabe kommt nach dreimal Weiterscrollen nicht');
  // Mischen: Ein Klick auf das Zeichen legt die Karten neu aus, und keine fällt vom Tisch.
  const davor = await fenster.evaluate(() => [...document.querySelectorAll('.karte')].map((k) => k.style.transform).join('|'));
  await fenster.locator('.kopf-marke').click();
  await fenster.waitForTimeout(400);
  const danach = await fenster.evaluate(() => [...document.querySelectorAll('.karte')].map((k) => k.style.transform).join('|'));
  if (davor === danach) b.melde(ort, 'ein Klick auf das Zeichen mischt die Karten nicht');
  await kontext.close();
}

// Ohne JavaScript: die ruhige Fassung zeigt jede Überschrift und läuft nicht über.
for (const seite of seiten) {
  const ort = `${seite} (ohne JavaScript)`;
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const fenster = await kontext.newPage();
  await fenster.goto(adresse + seite, { waitUntil: 'load' });
  for (const titel of await fenster.locator('h1, h2:not(.verborgen), h3').all()) {
    const sichtbar = await titel.evaluate((e) => {
      const r = e.getBoundingClientRect();
      let deckkraft = 1;
      for (let k = e; k; k = k.parentElement) deckkraft *= Number(getComputedStyle(k).opacity);
      return r.width > 0 && r.height > 0 && deckkraft > 0.9 && getComputedStyle(e).visibility === 'visible';
    });
    if (!sichtbar) b.melde(ort, `Überschrift nicht sichtbar: ${(await titel.textContent()).trim().slice(0, 40)}`);
  }
  const ueberlauf = await fenster.locator('html').evaluate((e) => e.scrollWidth - e.clientWidth);
  if (ueberlauf > 0) b.melde(ort, `horizontaler Überlauf um ${ueberlauf} Pixel`);
  await kontext.close();
}

await browser.close();
await schliessen();
b.schliesse(`${seiten.length} Seiten auf ${breiten.length} Breiten`);
