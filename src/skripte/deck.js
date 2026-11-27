// Legt das Deck: Der Tisch bleibt stehen, und mit jedem Stück Scrollen kommt eine Karte dazu.
// Die neue Karte fliegt in die Mitte, die vorherige gleitet an ihren Platz auf dem Tisch.
// Gescrollt wird nativ. Das Skript liest nur die Lage und bewegt die Karten weich nach.
// Ohne dieses Skript liegen alle Karten als Raster da.
const deck = document.querySelector('.deck');

if (deck) {
  const tisch = deck.querySelector('.tisch');
  const karten = [...deck.querySelectorAll('.karte')];
  const stand = deck.querySelector('[data-stand]');
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const anzahl = karten.length;
  const FORMAT = 341 / 493;
  // So viel Scrollweg, gemessen in Schirmhöhen, braucht eine Karte.
  const WEG = 0.7;

  // Feste Zufallswerte je Karte, damit der Tisch bei jedem Besuch gleich aussieht.
  const zufall = (i, salz) => {
    const x = Math.sin((i + 1) * 127.1 + salz * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let breite = 0;
  let hoehe = 0;
  let plaetze = [];
  let ziel = 0;
  let jetzt = 0;
  let bild = 0;

  function vermesse() {
    breite = tisch.clientWidth;
    hoehe = tisch.clientHeight;
    // Die Karte in der Mitte: so gross wie der Schirm es zulässt.
    const gross = Math.min(hoehe * 0.72, (breite * 0.8) / FORMAT, 640);
    deck.style.setProperty('--karte-h', `${gross}px`);
    deck.style.height = `${hoehe * (1 + anzahl * WEG)}px`;

    // Plätze auf dem Tisch: das Raster, in dem die Karten am grössten liegen.
    const rand = Math.max(16, breite * 0.04);
    // Oben bleibt Platz für das Zeichen.
    const kopf = document.querySelector('.kopf .zeichen');
    const oben = Math.max(hoehe * 0.11, (kopf?.getBoundingClientRect().bottom ?? 0) + 14);
    const unten = hoehe * 0.1;
    let beste = { h: 0, spalten: 1 };
    for (let spalten = 1; spalten <= anzahl; spalten += 1) {
      const zeilen = Math.ceil(anzahl / spalten);
      const h = Math.min(((hoehe - oben - unten) / zeilen) * 0.9, (((breite - 2 * rand) / spalten) * 0.9) / FORMAT);
      if (h > beste.h) beste = { h, spalten };
    }
    const zeilen = Math.ceil(anzahl / beste.spalten);
    const feldB = (breite - 2 * rand) / beste.spalten;
    const feldH = (hoehe - oben - unten) / zeilen;
    plaetze = karten.map((_, i) => {
      const spalte = i % beste.spalten;
      const zeile = Math.floor(i / beste.spalten);
      // Die letzte Zeile steht mittig, wenn sie nicht voll ist.
      const inZeile = zeile === zeilen - 1 ? anzahl - zeile * beste.spalten : beste.spalten;
      const versatz = ((beste.spalten - inZeile) * feldB) / 2;
      return {
        x: rand + versatz + feldB * (spalte + 0.5) - breite / 2 + (zufall(i, 1) - 0.5) * feldB * 0.1,
        y: oben + feldH * (zeile + 0.5) - hoehe / 2 + (zufall(i, 2) - 0.5) * feldH * 0.08,
        dreh: (zufall(i, 3) - 0.5) * 9,
        mass: beste.h / gross,
        // Woher die Karte kommt und wie sie in der Mitte liegt.
        vonX: (zufall(i, 4) - 0.5) * breite * 0.5,
        vonDreh: (zufall(i, 5) - 0.5) * 50,
        mitteDreh: (zufall(i, 6) - 0.5) * 5,
      };
    });
    lies();
    jetzt = ziel;
    zeichne();
  }

  const mische = (a, b, t) => a + (b - a) * t;
  const sanftAus = (t) => 1 - (1 - t) ** 3;
  const sanft = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function zeichne() {
    karten.forEach((karte, i) => {
      const p = plaetze[i];
      // 0 bis 1: Flug in die Mitte. 1 bis 2: Weg an den Platz. Die erste Karte liegt schon in der Mitte.
      const t = Math.min(2, Math.max(0, jetzt - i + 1));
      let x;
      let y;
      let dreh;
      let mass;
      if (t <= 1) {
        const e = sanftAus(t);
        x = mische(p.vonX, 0, e);
        y = mische(hoehe * 0.95, 0, e);
        dreh = mische(p.vonDreh, p.mitteDreh, e);
        mass = 1;
      } else {
        const e = sanft(t - 1);
        x = mische(0, p.x, e);
        y = mische(0, p.y, e);
        dreh = mische(p.mitteDreh, p.dreh, e);
        mass = mische(1, p.mass, e);
      }
      karte.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) rotate(${dreh.toFixed(2)}deg) scale(${mass.toFixed(4)})`;
      karte.style.visibility = t === 0 ? 'hidden' : 'visible';
      karte.style.zIndex = String(i + 1);
    });
    if (stand) stand.textContent = String(Math.min(anzahl, Math.max(1, Math.round(jetzt) + 1))).padStart(2, '0');
    tisch.classList.toggle('unterwegs', jetzt > 0.15);
  }

  function lies() {
    const weg = Math.max(0, -deck.getBoundingClientRect().top);
    ziel = Math.min(anzahl, weg / (hoehe * WEG));
  }

  function schritt() {
    // Die Karten folgen dem Scrollen mit kleiner Verzögerung. Das macht die Bewegung weich.
    const rest = ziel - jetzt;
    if (ruhig.matches || Math.abs(rest) < 0.0008) {
      jetzt = ziel;
      bild = 0;
    } else {
      jetzt += rest * 0.11;
      bild = requestAnimationFrame(schritt);
    }
    zeichne();
  }

  function folge() {
    lies();
    if (!bild) bild = requestAnimationFrame(schritt);
  }

  // Die erste Karte lädt zuerst. Ist die Seite da, folgen die übrigen, bevor sie an der Reihe sind.
  const ladeAlle = () => deck.querySelectorAll('img[loading="lazy"]').forEach((bild) => (bild.loading = 'eager'));
  if (document.readyState === 'complete') ladeAlle();
  else addEventListener('load', ladeAlle, { once: true });

  document.documentElement.classList.add('gelegt');
  vermesse();
  addEventListener('scroll', folge, { passive: true });
  addEventListener('resize', vermesse);
}
