// Ergänzt die Ausstellung: markiert das Kapitel im Bild, führt den Faden nach und lässt
// Pfeiltasten von Kapitel zu Kapitel gehen. Gescrollt wird nativ. Ohne dieses Skript steht alles ruhig da.
const kapitel = [...document.querySelectorAll('.kapitel')];

if (kapitel.length > 0) {
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const faden = new Map([...document.querySelectorAll('.faden a')].map((a) => [a.hash.slice(1), a]));
  let aktuell = 0;

  const zeige = (i) => {
    aktuell = i;
    kapitel.forEach((k, j) => k.classList.toggle('aktiv', j === i));
    for (const [id, a] of faden) {
      if (id === kapitel[i].id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  const waechter = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) if (e.isIntersecting) zeige(kapitel.indexOf(e.target));
    },
    { threshold: 0.55 },
  );
  kapitel.forEach((k) => waechter.observe(k));

  // Das erste Kapitel im Bild ist sichtbar, bevor die Bewegung eingeschaltet wird.
  const oben = kapitel.findIndex((k) => k.getBoundingClientRect().bottom > innerHeight / 2);
  zeige(Math.max(0, oben));
  document.documentElement.classList.add('bewegt');

  const gehe = (i) => {
    const ziel = kapitel[Math.min(kapitel.length - 1, Math.max(0, i))];
    ziel.scrollIntoView({ behavior: ruhig.matches ? 'auto' : 'smooth', block: 'start' });
  };

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const schritt = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (schritt === undefined) return;
    // Am Ende der Ausstellung gehört die Taste wieder dem Fuss der Seite.
    if (schritt === 1 && aktuell === kapitel.length - 1) return;
    e.preventDefault();
    gehe(aktuell + schritt);
  });
}
