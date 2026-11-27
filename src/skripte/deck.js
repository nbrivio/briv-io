// Legt das Deck: Der Tisch bleibt stehen, und mit jedem Stück Scrollen kommt eine Karte dazu.
// Die neue Karte fliegt in die Mitte, die vorherige gleitet an ihren Platz auf dem Tisch.
// Gescrollt wird nativ. Das Skript liest nur die Lage und bewegt die Karten weich nach.
// Ohne dieses Skript liegen alle Karten als Raster da.

// Für alle, die nachschauen.
console.log('%cCurious? Good.', 'font: italic 20px Georgia, serif; color: #ffb319; background: #103f32; padding: 10px 16px; border-radius: 4px');
console.log('Stay curious. Build things. Repeat.');

const deck = document.querySelector('.deck');

if (deck) {
  const tisch = deck.querySelector('.tisch');
  const karten = [...deck.querySelectorAll('.karte')];
  const zugabe = deck.querySelector('.zugabe');
  const stand = deck.querySelector('[data-stand]');
  const marke = document.querySelector('.kopf-marke');
  const zeichen = marke?.querySelector('.zeichen');
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const anzahl = karten.length;
  const FORMAT = 1086 / 1448;
  // So viel Scrollweg, gemessen in Schirmhöhen, braucht eine Karte.
  const WEG = 0.7;
  // So oft muss am Ende weitergescrollt werden, bis die Zugabe kommt.
  const VERSUCHE = 3;

  // Feste Zufallswerte je Karte, damit der Tisch bei jedem Besuch gleich aussieht.
  const zufall = (i, salz) => {
    const x = Math.sin((i + 1) * 127.1 + salz * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let breite = 0;
  let hoehe = 0;
  let plaetze = [];
  let fluege = [];
  let ziel = 0;
  let jetzt = 0;
  let bild = 0;

  // Mischen: welche Karte auf welchem Platz liegt, vorher und nachher.
  let ordnung = karten.map((_, i) => i);
  let vorher = ordnung.slice();
  let wirbel = 1;
  let wirbelBeginn = 0;

  // Zugabe: die Karte, die erst kommt, wenn jemand am Ende weiterscrollt.
  let versuche = 0;
  let letzterVersuch = 0;
  let zugabeDa = false;
  let zugabeStand = 0;
  let zugabeBeginn = 0;

  function vermesse() {
    breite = tisch.clientWidth;
    hoehe = tisch.clientHeight;
    // Die Karte in der Mitte: so gross wie der Schirm es zulässt.
    const gross = Math.min(hoehe * 0.76, (breite * 0.82) / FORMAT, 780);
    deck.style.setProperty('--karte-h', `${gross}px`);
    deck.style.height = `${hoehe * (1 + anzahl * WEG)}px`;

    // Plätze auf dem Tisch: das Raster, in dem die Karten am grössten liegen.
    const rand = Math.max(16, breite * 0.04);
    // Oben bleibt Platz für das Zeichen.
    const oben = Math.max(hoehe * 0.11, (zeichen?.getBoundingClientRect().bottom ?? 0) + 14);
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
      };
    });
    // Woher jede Karte kommt und wie sie in der Mitte liegt.
    fluege = karten.map((_, i) => ({
      vonX: (zufall(i, 4) - 0.5) * breite * 0.5,
      vonDreh: (zufall(i, 5) - 0.5) * 50,
      mitteDreh: (zufall(i, 6) - 0.5) * 5,
    }));
    lies();
    jetzt = ziel;
    zeichne();
  }

  const mische = (a, b, t) => a + (b - a) * t;
  const sanftAus = (t) => 1 - (1 - t) ** 3;
  const sanft = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  // Schwingt am Ende leicht über das Ziel hinaus, wie eine hingeworfene Karte.
  const schwung = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  const lage = (x, y, dreh, mass) => `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) rotate(${dreh.toFixed(2)}deg) scale(${mass.toFixed(4)})`;

  function zeichne() {
    const w = sanft(wirbel);
    const bogen = Math.sin(Math.PI * wirbel);
    karten.forEach((karte, i) => {
      const f = fluege[i];
      // Der Platz der Karte. Beim Mischen wandert sie im Bogen vom alten zum neuen.
      const a = plaetze[vorher[i]];
      const b = plaetze[ordnung[i]];
      const platz = {
        x: mische(a.x, b.x, w),
        y: mische(a.y, b.y, w) - bogen * hoehe * 0.05,
        dreh: mische(a.dreh, b.dreh, w),
        mass: mische(a.mass, b.mass, w) * (1 + bogen * 0.08),
      };
      // 0 bis 1: Flug in die Mitte. 1 bis 2: Weg an den Platz. Die erste Karte liegt schon in der Mitte.
      const t = Math.min(2, Math.max(0, jetzt - i + 1));
      if (t <= 1) {
        const e = sanftAus(t);
        karte.style.transform = lage(mische(f.vonX, 0, e), mische(hoehe * 0.95, 0, e), mische(f.vonDreh, f.mitteDreh, e), 1);
      } else {
        const e = sanft(t - 1);
        karte.style.transform = lage(mische(0, platz.x, e), mische(0, platz.y, e), mische(f.mitteDreh, platz.dreh, e), mische(1, platz.mass, e));
      }
      karte.style.visibility = t === 0 ? 'hidden' : 'visible';
      // Beim Mischen liegen die Karten nach ihrem neuen Platz übereinander, sonst nach ihrer Reihenfolge.
      karte.style.zIndex = String(i + 1);
    });
    if (zugabe && zugabeDa) {
      const e = schwung(zugabeStand);
      zugabe.style.transform = lage(mische(breite * 0.2, 0, e), mische(hoehe * 0.95, 0, e), mische(-24, 3.5, e), 1);
    }
    if (stand) stand.textContent = String(zugabeDa ? anzahl + 1 : Math.min(anzahl, Math.max(1, Math.round(jetzt) + 1))).padStart(2, '0');
    tisch.classList.toggle('unterwegs', jetzt > 0.15);
  }

  function lies() {
    const weg = Math.max(0, -deck.getBoundingClientRect().top);
    ziel = Math.min(anzahl, weg / (hoehe * WEG));
    // Wer zurückscrollt, legt die Zugabe wieder weg.
    if (zugabeDa && ziel < anzahl - 0.4) raeumeZugabe();
  }

  function schritt(zeit) {
    let weiter = false;
    // Die Karten folgen dem Scrollen mit kleiner Verzögerung. Das macht die Bewegung weich.
    const rest = ziel - jetzt;
    if (ruhig.matches || Math.abs(rest) < 0.0008) {
      jetzt = ziel;
    } else {
      jetzt += rest * 0.11;
      weiter = true;
    }
    if (wirbel < 1) {
      wirbel = Math.min(1, (zeit - wirbelBeginn) / 900);
      weiter = true;
    }
    if (zugabeDa && zugabeStand < 1) {
      zugabeStand = Math.min(1, (zeit - zugabeBeginn) / 900);
      weiter = true;
    }
    zeichne();
    bild = weiter ? requestAnimationFrame(schritt) : 0;
  }

  const laufe = () => {
    if (!bild) bild = requestAnimationFrame(schritt);
  };

  function folge() {
    lies();
    laufe();
  }

  // Mischen: Alle Karten heben kurz ab und gleiten im Bogen auf neue Plätze. Gedreht wird dabei nicht.
  function mischeDeck() {
    if (wirbel < 1) return;
    vorher = ordnung.slice();
    do {
      for (let i = ordnung.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordnung[i], ordnung[j]] = [ordnung[j], ordnung[i]];
      }
    } while (anzahl > 2 && ordnung.every((platz, i) => platz === vorher[i]));
    if (ruhig.matches) {
      wirbel = 1;
      zeichne();
      return;
    }
    wirbel = 0;
    wirbelBeginn = performance.now();
    laufe();
  }

  // Zugabe: Am Ende kommt nichts mehr. Wer trotzdem weiterscrollt, bekommt noch eine Karte.
  const amEnde = () => ziel >= anzahl - 0.01 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2;

  function versuch() {
    if (!zugabe || zugabeDa || !amEnde()) return;
    const zeit = performance.now();
    // Ein Schwung am Trackpad sendet viele Ereignisse. Gezählt wird erst wieder nach einer Pause.
    if (zeit - letzterVersuch < 420) {
      letzterVersuch = zeit;
      return;
    }
    letzterVersuch = zeit;
    versuche += 1;
    if (versuche >= VERSUCHE) zeigeZugabe();
  }

  function zeigeZugabe() {
    zugabeDa = true;
    zugabe.hidden = false;
    zugabeStand = ruhig.matches ? 1 : 0;
    zugabeBeginn = performance.now();
    zeichne();
    laufe();
  }

  function raeumeZugabe() {
    zugabeDa = false;
    zugabe.hidden = true;
    versuche = 0;
  }

  addEventListener('wheel', (e) => e.deltaY > 0 && versuch(), { passive: true });
  let beruehrung = 0;
  addEventListener('touchstart', (e) => (beruehrung = e.changedTouches[0].clientY), { passive: true });
  addEventListener('touchend', (e) => beruehrung - e.changedTouches[0].clientY > 40 && versuch(), { passive: true });
  addEventListener('keydown', (e) => ['ArrowDown', 'PageDown', 'End', ' '].includes(e.key) && !e.target.closest?.('a, button') && versuch());

  // Das Zeichen: Es neigt sich dem Zeiger zu. Ein Klick lässt die Schwalben auffliegen und mischt die Karten.
  if (marke && zeichen) {
    marke.setAttribute('role', 'button');
    marke.setAttribute('aria-label', 'Karten neu mischen');
    const flattere = () => {
      if (ruhig.matches) return;
      zeichen.classList.remove('flattert');
      // Der erzwungene Neuaufbau lässt die Bewegung auch beim zweiten Klick von vorn beginnen.
      void zeichen.offsetWidth;
      zeichen.classList.add('flattert');
    };
    marke.addEventListener('click', (e) => {
      e.preventDefault();
      flattere();
      mischeDeck();
    });
    marke.addEventListener('keydown', (e) => {
      if (e.key !== ' ') return;
      e.preventDefault();
      marke.click();
    });

    let blick = 0;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || ruhig.matches || blick) return;
      blick = requestAnimationFrame(() => {
        blick = 0;
        const r = zeichen.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        zeichen.style.setProperty('--blick-x', `${(dx * 9).toFixed(2)}px`);
        zeichen.style.setProperty('--blick-y', `${(dy * 7).toFixed(2)}px`);
        zeichen.style.setProperty('--blick-dreh', `${(dx * 7).toFixed(2)}deg`);
      });
    }, { passive: true });

    // Schütteln mischt auch. Wo das Gerät dafür erst um Erlaubnis fragen müsste, bleibt es beim Antippen.
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
      let zuletzt = 0;
      addEventListener('devicemotion', (e) => {
        const b = e.acceleration;
        if (!b || performance.now() - zuletzt < 1600) return;
        if (Math.hypot(b.x ?? 0, b.y ?? 0, b.z ?? 0) > 18) {
          zuletzt = performance.now();
          flattere();
          mischeDeck();
        }
      });
    }
  }

  // Die erste Karte lädt zuerst. Ist die Seite da, folgen die übrigen, bevor sie an der Reihe sind.
  const ladeAlle = () => deck.querySelectorAll('img[loading="lazy"]').forEach((b) => (b.loading = 'eager'));
  if (document.readyState === 'complete') ladeAlle();
  else addEventListener('load', ladeAlle, { once: true });

  document.documentElement.classList.add('gelegt');
  vermesse();
  addEventListener('scroll', folge, { passive: true });
  addEventListener('resize', vermesse);
}
