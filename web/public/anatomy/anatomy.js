// Anatomy of a GPU-hour: scroll-driven explainer for /anatomy.
// Plain script (no build step). Needs three.min.js (r128) loaded first; without WebGL it falls back to line drawings.
// The page markup and the live price values come from src/pages/anatomy.astro.
(function () {
'use strict';
const ROOT = document.getElementById('anatomy');
if (!ROOT) return;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LIVE = (d => ({ name: d.name || 'B200', unit: d.unit || 'USD per GPU-hour', price: d.price || '', pct: d.pct || '', dir: d.dir || '', href: d.href || '#' }))(document.getElementById('scrolly').dataset);
/* ---------- drawing kit ---------- */
const f1 = n => Number(n).toFixed(1);
const P = (d, c = '') => `<path d="${d}" class="${c}"/>`;
const R = (x, y, w, h, c = '', rx = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
const C = (cx, cy, r, c = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${c}"/>`;
const E = (cx, cy, rx, ry, c = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="${c}"/>`;
const T = (x, y, s, c = '', a = 'middle', extra = '') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${a}" class="${c}" ${extra}>${s}</text>`;
function chip(x, y, s, c = 'wg') {
  let o = R(x, y, s, s, c, s * 0.1) + R(x + s * 0.27, y + s * 0.27, s * 0.46, s * 0.46, 'ws', 2);
  const p = s * 0.14;
  for (let i = 1; i <= 3; i++) { const t = +f1(s * i / 4); o += P(`M${x + t},${y} v${-p} M${x + t},${y + s} v${p} M${x},${y + t} h${-p} M${x + s},${y + t} h${p}`); }
  return o;
}
function arrow(x1, y1, x2, y2, c = '') {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
  const pt = d => `${f1(x2 - h * Math.cos(a + d))},${f1(y2 - h * Math.sin(a + d))}`;
  return P(`M${x1},${y1} L${x2},${y2} M${pt(0.5)} L${x2},${y2} L${pt(-0.5)}`, c);
}
function lock(cx, cy, s, c = '') { return P(`M${cx - s * 0.3},${cy} v${-s * 0.32} a${s * 0.3},${s * 0.3} 0 0 1 ${s * 0.6},0 v${s * 0.32}`, c) + R(cx - s / 2, cy, s, s * 0.8, 'ws ' + c, 4) + C(cx, cy + s * 0.4, 2.5, c); }
function robot(cx, cy, s, c = 'wg') {
  return P(`M${cx},${cy - 1.15 * s} v${-0.2 * s}`) + C(cx, cy - 1.42 * s, 3)
    + R(cx - 0.42 * s, cy - 1.15 * s, 0.84 * s, 0.6 * s, c, 4) + C(cx - 0.17 * s, cy - 0.86 * s, 2.5) + C(cx + 0.17 * s, cy - 0.86 * s, 2.5)
    + R(cx - 0.55 * s, cy - 0.45 * s, 1.1 * s, 0.95 * s, c, 4)
    + P(`M${cx - 0.55 * s},${cy - 0.2 * s} l${-0.3 * s},${0.4 * s} M${cx + 0.55 * s},${cy - 0.2 * s} l${0.3 * s},${0.4 * s}`);
}
const ringBody = (y, h, c = 'wo') => P(`M90,${y} A60,16 0 0 0 210,${y} L210,${y + h} A60,16 0 0 1 90,${y + h} Z`, c);
const hoop = y => P(`M90,${y} a60,16 0 0 0 120,0`);
const slab = (y, h, c = 'wg') => R(65, y, 170, h, c, 8) + P(`M72,${y + h - 7} H228`);

/* A piece is one part of the drawing. moves: where it travels and at which step. from/fade: parts that appear. */
function piece(o, build) {
  const tot = (o.moves || []).reduce((a, m) => ({ dx: a.dx + (m.dx || 0), dy: a.dy + (m.dy || 0) }), { dx: 0, dy: 0 });
  const L = (x, y, s, c = '', a = 'middle', extra = '') => T(x - tot.dx, y - tot.dy, s, c, a, extra);   // label placed by its final position
  return { moves: [], ...o, html: build(L) };
}
const show = s => `data-show="${s}"`;

/* ---------- the barrel, back to front ---------- */
const OIL = [
  piece({ step: 10, fade: 10, from: { dy: -24 } }, () => T(150, 588, 'next: gas, power, shipping', 'sm o')),
  piece({ step: 9, fade: 9, from: { dy: -34 } }, () => R(80, 500, 140, 40, 'ws', 5) + T(150, 527, 'bank loan', 'sm')),
  piece({ step: 3, moves: [{ s: 3, dy: 60 }] }, L => ringBody(350, 50) + E(150, 350, 60, 16, 'crude') + L(150, 446, 'scarcity', 'sm o', 'middle', show(3))),
  piece({ step: 4, moves: [{ s: 4, dx: -112 }] }, L => P('M125,312 V338 A25,7 0 0 0 175,338 V312', 'crude') + E(150, 312, 25, 7, 'crude') + L(10, 372, 'it waits', 'sm', 'start', show(4))),
  piece({ step: 3 }, () => ringBody(300, 50) + E(150, 300, 60, 16, 'crude') + T(150, 340, 'ship + refine', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: [{ s: 3, dy: -60 }] }, L => ringBody(250, 50) + E(150, 250, 60, 16, 'crude') + L(150, 230, 'getting it out', 'sm', 'middle', show(3))),
  piece({ step: 2, moves: [{ s: 2, dy: -70 }, { s: 3, dy: -60 }] }, L => E(150, 250, 60, 16, 'wo') + E(172, 247, 8, 3, 'ws') + L(150, 96, 'to the refinery', 'sm', 'middle', show(2))),
  piece({ step: 1, moves: [{ s: 1, dx: -108, dy: -108 }] }, () => R(115, 308, 70, 30, 'ws', 4) + T(150, 328, 'BRENT', 'sm')),
  piece({ step: 5, fade: 5, from: { dx: -40 } }, () => C(258, 438, 18, 'ws') + T(258, 443, '2016', 'sm') + T(258, 482, '= today', 'sm o')),
  piece({ step: 6, fade: 6, from: { dx: -30 } }, () => P('M222,318 L211,322') + R(222, 300, 74, 34, 'ws ho', 4) + T(259, 322, '$ public', 'sm')),
  piece({ step: 8, fade: 8, from: { dx: 26 } }, () => lock(261, 358, 24, 'ho')),
  piece({ step: 7, fade: 7, from: { dy: -18 } }, () => R(70, 20, 160, 46, 'ws ho', 6) + T(150, 48, 'BRENT')),
  piece({ step: 0 }, () => T(150, 444, '1 barrel', 'o', 'middle', 'data-hide="2"')),
];

/* ---------- the GPU, back to front ---------- */
const GY = [292, 301, 310, 319, 328, 337], GF = [150, 200, 250, 300, 350, 400];
const gmove = k => [{ s: 3, dy: GF[k] - GY[k] }];
const GPU = [
  piece({ step: 10, fade: 10, from: { dy: -24 } }, () => robot(262, 580, 20) + T(140, 612, 'next: robot-hours', 'sm g')),
  piece({ step: 9, fade: 9, from: { dy: -34 } }, () => R(85, 520, 130, 16, 'wg hl', 3) + R(85, 540, 130, 12, 'wg', 3) + R(85, 556, 130, 10, 'ws', 3) + T(150, 588, 'rated notes', 'sm g')),
  piece({ step: 3, moves: gmove(5) }, L => slab(337, 50) + chip(80, 345, 30, 'ws') + L(180, 431, 'hardware 42%', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: gmove(4) }, L => slab(328, 38) + P('M100,335 l-9,13 h8 l-3,12 l11,-15 h-8 Z', 'ws') + L(180, 375, 'power 16%', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: gmove(3) }, L => slab(319, 38) + C(84, 333, 2.5) + C(96, 333, 2.5) + C(108, 333, 2.5) + L(180, 325, 'building 14%', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: gmove(2) }, L => slab(310, 38) + P('M78,322 h26 v9 h16') + L(180, 275, 'financing 12%', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: gmove(1) }, L => slab(301, 38) + P('M80,308 v18 M90,308 v18 M100,308 v18 M110,308 v18') + L(180, 225, 'running it 8%', 'sm', 'middle', show(3))),
  piece({ step: 3, moves: gmove(0) }, L => slab(292, 38) + E(104, 308, 24, 10, 'ws') + P('M80,308 H128 M104,298 V318') + L(184, 175, 'scarcity 8%', 'sm g', 'middle', show(3))),
  piece({ step: 1, moves: [{ s: 1, dx: -135, dy: -200 }] }, () => R(150, 299, 70, 24, 'ws', 4) + T(185, 316, 'B200', 'sm')),
  piece({ step: 2, moves: [{ s: 2, dx: -18, dy: 40 }, { s: 3, dy: 85 }] }, L => P('M38,357 h-12 v26') + R(38, 346, 30, 22, 'ws', 4) + P('M68,352 h8 M68,362 h8') + L(62, 492, 'power in', 'sm', 'start', show(2))),
  piece({ step: 4, moves: [{ s: 3, dx: 8, dy: -150 }, { s: 4, dx: 8, dy: -30 }], fadeOut: { s: 4, to: 0.5 } }, L => C(238, 290, 20, 'ws') + P('M238,290 V277 M238,290 H247') + L(296, 84, 'gone for good', 'sm d', 'end', show(4))),
  piece({ step: 5, fade: 5, from: { dx: 26 } }, () => chip(250, 398, 34) + arrow(267, 440, 267, 462, 'down') + T(296, 388, 'new chip', 'sm d', 'end')),
  piece({ step: 6, fade: 6, from: { dx: -30 } }, () => R(222, 470, 66, 40, 'ws', 4) + P('M222,470 l33,22 l33,-22') + T(255, 530, 'private', 'sm d')),
  piece({ step: 8, fade: 8, from: { dx: -26 } }, () => lock(203, 486, 24, 'hl')),
  piece({ step: 7, fade: 7, from: { dy: -18 } }, () => R(70, 20, 160, 46, 'ws hl', 6) + T(150, 48, 'GPU INDEX')),
  piece({ step: 0 }, () => T(150, 424, '1 GPU-hour', 'g', 'middle', 'data-hide="2"')),
];

/* ---------- the script: one entry per piece. Edit copy here. [[word|definition]] makes a tap-to-explain term. ---------- */
const STEPS = [
  { id: 'the-thing-you-buy', ko: '1 barrel', kg: '1 GPU-hour', tag: 'same', title: 'The thing you buy',
    oil: 'Oil is sold by the <b>barrel</b>: 159 litres of crude.',
    gpu: 'AI compute is sold by the <b>GPU-hour</b>: one [[GPU|A graphics processing unit. The chip that trains and runs AI models.]], rented for one hour.',
    so: 'Every AI answer, image and model is made out of these hours.' },
  { id: 'grades', ko: 'Brent, WTI, Dubai', kg: 'H100, B200, B300', tag: 'same', title: 'It comes in grades',
    oil: 'Peel off the label. <b>Brent, WTI and Dubai</b> are different crudes, each with its own price.',
    gpu: '<b>H100, B200 and B300</b> are different chips. Newer ones do more work per hour, so they rent for more.',
    so: 'When people quote “the price”, they always mean one grade.' },
  { id: 'the-refinery', ko: 'The refinery', kg: 'The data center', tag: 'same', title: 'Something has to make it',
    oil: 'Lift the lid. Crude goes to a <b>refinery</b>, which turns it into fuel.',
    gpu: 'Pull the plug. A <b>data center</b> turns electricity into GPU-hours.',
    so: 'Both cost billions and take years to build, so supply reacts slowly when demand jumps.' },
  { id: 'inside-the-price', ko: 'Three cost layers', kg: '42% is the chip', tag: 'same', title: 'What is inside the price',
    oil: 'Slice the barrel. Its price covers getting oil out of the ground, shipping and refining it, and a premium when supply is tight.',
    gpu: 'Slice the card. A GPU-hour is mostly the chip itself, then power, the building, financing and staff. Scarcity is the thinnest layer and the one that moves fastest.',
    so: 'When a new chip is short, that thin top layer can swell overnight.',
    src: 'Compute shares are illustrative and vary by chip and site.' },
  { id: 'storage', ko: 'Keeps for months', kg: 'Gone in an hour', tag: 'diff', title: 'You cannot store it',
    oil: 'Oil can wait. It sits in tanks and tankers until someone wants it.',
    gpu: 'The hour cannot. A GPU-hour that nobody rents is <b>gone for good</b>, like an empty seat on a plane that has taken off.',
    so: 'So compute prices can swing harder than oil. In this respect compute behaves more like electricity.' },
  { id: 'aging', ko: 'Holds its value', kg: 'Fades with every new chip', tag: 'diff', title: 'It ages fast',
    oil: 'A barrel pumped ten years ago is worth the same as one pumped today.',
    gpu: 'A chip keeps working for years, but every new generation pushes its rent down. This is [[depreciation|The loss of value as something gets older or is overtaken by something better.]], the biggest worry for anyone lending against chips.',
    so: 'A trusted price history is what tells a lender how fast that value fades.' },
  { id: 'who-sets-the-price', ko: 'One public price', kg: 'Private deals', tag: 'missing', title: 'Who sets the price',
    oil: 'Anyone can look up today’s price of Brent. It was not always so: for decades, prices were simply posted by the big producers.',
    gpu: 'Compute is where oil was back then. Prices are agreed in private. Two buyers can pay very different amounts for the same chip, and neither knows.',
    so: 'Around $725 billion is being spent on AI infrastructure this year without a price everyone agrees on.' },
  { id: 'the-benchmark', ko: 'Brent', kg: 'A GPU index', tag: 'missing', title: 'The benchmark',
    oil: 'Brent is a [[benchmark|One published price that everyone agrees to use as the reference in their contracts.]]. Contracts all over the world simply say “Brent, plus or minus”.',
    gpu: 'Compute needs the same: one trusted number per chip, per region, worked out from real prices by rules anyone can check.',
    so: 'This is the piece DKW has built.', live: true },
  { id: 'the-hedge', ko: 'Fuel swaps', kg: 'Compute swaps', tag: 'missing', title: 'The hedge',
    oil: 'An airline can fix next year’s fuel price today with a [[swap|A contract where one side pays a fixed price and the other pays whatever the benchmark turns out to be. They settle the difference in cash.]]. The producer on the other side fixes its income.',
    gpu: 'An AI company should be able to fix next year’s compute bill the same way, and the data-center owner its income.',
    so: 'A swap only works if both sides trust the benchmark it settles against. Benchmark first, hedge second.' },
  { id: 'the-loan', ko: 'Loans on reserves', kg: 'Rated notes on GPUs', tag: 'missing', title: 'The loan',
    oil: 'Banks lend against oil still in the ground, because the market tells them what it will be worth years ahead.',
    gpu: 'GPU fleets are bought with borrowed money: about $48 billion in 2026 so far. With a forward price, bundles of compute contracts can become [[rated notes|Bonds that a rating agency has graded for safety, so pension funds and insurers are allowed to buy them.]] that large investors can hold.',
    so: 'The benchmark is what turns a risky chip into something a pension fund can finance.' },
  { id: 'what-comes-next', ko: 'Gas, power, shipping', kg: 'Robot-hours', tag: 'same', title: 'What comes next',
    oil: 'Once oil had benchmarks, hedges and loans, the same playbook spread to gas, electricity and shipping.',
    gpu: 'Compute’s playbook spreads to <b>robots</b>. A robot-hour also ages, cannot be stored and runs on power.',
    so: 'First the price, then the finance, then the next machine.' },
];
const TAGS = { same: 'Same as oil', diff: 'Different from oil', missing: 'Missing today' };
const VERDICTS = {
  all: 'Most of a GPU-hour works like a barrel of oil. Two things are different, and three things oil has are still missing.',
  same: 'The basics match: a unit, grades, a plant that makes it, a price built from layers, and a playbook that travels.',
  diff: 'Two differences matter: you cannot store an hour, and chips lose value fast. Both make a trusted price more important.',
  missing: 'These three are the whole opportunity: a price everyone trusts, a way to lock it in, and a way to lend against it. They have to be built in that order.',
};
const N = STEPS.length + 1;   // 11 pieces + the summary

/* ---------- render ---------- */
const svgOil = document.getElementById('svgOil'), svgGpu = document.getElementById('svgGpu');
const draw = (list, side) => `<g class="ink">${list.map((p, k) => `<g class="piece" data-side="${side}" data-k="${k}">${p.html}</g>`).join('')}</g>`;
svgOil.innerHTML = draw(OIL, 'oil'); svgGpu.innerHTML = draw(GPU, 'gpu');
const nodes = [...document.querySelectorAll('.piece')].map(g => ({ g, def: (g.dataset.side === 'oil' ? OIL : GPU)[+g.dataset.k] }));
const shows = [...document.querySelectorAll('[data-show]')], hides = [...document.querySelectorAll('[data-hide]')];

let termN = 0;
const terms = s => s.replace(/\[\[(.+?)\|(.+?)\]\]/g, (m, w, d) => { termN++; return `<button type="button" class="term" id="term-${termN}" aria-expanded="false" aria-controls="def-${termN}">${w}</button><span class="def" id="def-${termN}" hidden>${d}</span>`; });
const num = i => String(i + 1).padStart(2, '0');
const cardTop = (i, tag) => `<header class="card-top">${tag ? `<span class="tag ${tag}">${TAGS[tag]}</span>` : '<span class="tag">Summary</span>'}<span class="count"><b>${num(i)}</b> / ${N}</span></header>`;
document.getElementById('deck').innerHTML = STEPS.map((s, i) => `
  <article class="card" data-i="${i}">
    ${cardTop(i, s.tag)}
    <h2>${s.title}</h2>
    <div class="vs">
      <div class="side"><p class="who">Oil</p><p class="key">${s.ko}</p><p class="txt">${terms(s.oil)}</p></div>
      <div class="side"><p class="who">Compute</p><p class="key">${s.kg}</p><p class="txt">${terms(s.gpu)}</p></div>
    </div>
    ${s.live ? `<a class="live" href="${esc(LIVE.href)}"><span><span class="name">${esc(LIVE.name)}</span> <span class="unit">${esc(LIVE.unit)}</span></span><span><span class="price" id="live-price">${esc(LIVE.price)}</span> <span class="pill ${esc(LIVE.dir)}" id="live-pill">${esc(LIVE.pct)}</span></span></a><p class="src">Live from the DKW index. Select it for the full chart.</p>` : ''}
    <div class="sowhat"><span class="lab">Why it matters</span>${s.so}</div>
    ${s.src ? `<p class="src">${s.src}</p>` : ''}
  </article>`).join('') + `
  <article class="card" data-i="${N - 1}">
    ${cardTop(N - 1, '')}
    <h2>All the pieces</h2>
    <div class="filters" role="group" aria-label="Filter the pieces">
      <button type="button" id="f-all" data-f="all" aria-pressed="true">All</button>
      <button type="button" id="f-same" data-f="same" aria-pressed="false">Same as oil</button>
      <button type="button" id="f-diff" data-f="diff" aria-pressed="false">Different from oil</button>
      <button type="button" id="f-missing" data-f="missing" aria-pressed="false">Missing today</button>
    </div>
    <ul class="jump" id="jump">${STEPS.map((s, k) => `<li data-tag="${s.tag}"><a href="#${s.id}"><span class="dot ${s.tag}"></span><span class="n">${num(k)}</span>${s.title}</a></li>`).join('')}</ul>
    <div class="sowhat"><span class="lab">The takeaway</span><span id="verdict"></span></div>
  </article>`;
const cards = [...document.querySelectorAll('.card')];

const scrolly = document.getElementById('scrolly');
scrolly.style.height = `calc(${N + 0.4} * 100vh)`;
const ids = [...STEPS.map(s => s.id), 'all-the-pieces'];
scrolly.insertAdjacentHTML('afterbegin', ids.map((id, i) => `<span class="anchor" id="${id}" style="top:calc(${i} * 100vh)"></span>`).join(''));
document.getElementById('prog').innerHTML = ids.map((id, i) => `<a href="#${id}" class="${i < STEPS.length ? STEPS[i].tag : ''}" aria-label="${i < STEPS.length ? STEPS[i].title : 'All the pieces'}"></a>`).join('');
const dots = [...document.querySelectorAll('.prog a')];

/* glossary + filter */
let filter = 'all';
document.addEventListener('click', e => {
  const t = e.target.closest('.term');
  if (t) { const d = document.getElementById(t.getAttribute('aria-controls')); d.hidden = !d.hidden; t.setAttribute('aria-expanded', String(!d.hidden)); return; }
  const b = e.target.closest('.filters button');
  if (b) { setFilter(b.dataset.f); onScroll(); }
});
function setFilter(f) {
  filter = f;
  document.querySelectorAll('.filters button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  document.querySelectorAll('#jump li').forEach(li => { li.hidden = f !== 'all' && li.dataset.tag !== f; });
  document.getElementById('verdict').textContent = VERDICTS[f];
}
setFilter('all');

/* ---------- 3D objects (three.js). Falls back to the line drawings if WebGL is unavailable. ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, k) => a + (b - a) * k;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GREEN = 0x00a805;

function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 16), new THREE.MeshBasicMaterial({ color: 0x060607, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(11, 9, 0, 14, 2, 7); panel(3, 14, -13, 3, 5, 5); panel(3, 12, 13, 4, -4, 6); panel(10, 2.5, 0, -2, 15, 0.9); panel(5, 5, 6, 9, 9, 2.2);
  const tex = pm.fromScene(s, 0.03).texture; pm.dispose(); return tex;
}
const MAT = {
  enamel: () => new THREE.MeshPhysicalMaterial({ color: 0x1b4a73, metalness: 0.55, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.22 }),
  steel: () => new THREE.MeshStandardMaterial({ color: 0xc2c7ce, metalness: 1, roughness: 0.26 }),
  crude: () => new THREE.MeshPhysicalMaterial({ color: 0x0c0906, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 }),
  graphite: () => new THREE.MeshPhysicalMaterial({ color: 0x1c1e22, metalness: 0.7, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  alu: () => new THREE.MeshStandardMaterial({ color: 0xd9dce0, metalness: 1, roughness: 0.32 }),
  copper: () => new THREE.MeshStandardMaterial({ color: 0xc9794a, metalness: 1, roughness: 0.28 }),
  pcb: () => new THREE.MeshStandardMaterial({ color: 0x103322, metalness: 0.25, roughness: 0.55 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xdcb651, metalness: 1, roughness: 0.3 }),
  silicon: () => new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 1, roughness: 0.06 }),
  black: () => new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.3, roughness: 0.5 }),
  white: () => new THREE.MeshStandardMaterial({ color: 0xf2f3f5, metalness: 0, roughness: 0.5 }),
  green: () => new THREE.MeshStandardMaterial({ color: GREEN, metalness: 0.35, roughness: 0.38 }),
  glow: () => { const m = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 0.9, roughness: 0.4 }); m.userData.noGlow = true; return m; },
};
Object.keys(MAT).forEach(k => { const f = MAT[k]; MAT[k] = () => { const m = f(); m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); return m; }; });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (r, h, mat, x, y, z, seg = 48) => mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z);

function textTex(draw, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
const FONT = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
function words(text, o = {}) {
  return (x, w, h) => {
    x.fillStyle = o.bg || '#ffffff'; x.fillRect(0, 0, w, h);
    if (o.border) { x.strokeStyle = o.border; x.lineWidth = h * 0.09; x.strokeRect(h * 0.045, h * 0.045, w - h * 0.09, h - h * 0.09); }
    x.fillStyle = o.fg || '#000000'; x.font = `700 ${Math.round(h * 0.46)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + h * 0.03);
  };
}
function plate(w, h, draw) {
  const face = new THREE.MeshStandardMaterial({ map: textTex(draw, 512, Math.round(512 * h / w)), roughness: 0.5, metalness: 0 }); face.userData.noGlow = true;
  const side = new THREE.MeshStandardMaterial({ color: 0x9a9ea5, roughness: 0.5 }); side.userData.noGlow = true;
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), [side, side, side, side, face, side]);
}
function padlock(g) {
  g.add(box(0.34, 0.27, 0.12, MAT.green(), 0, 0, 0));
  const sh = mesh(new THREE.TorusGeometry(0.105, 0.032, 10, 24, Math.PI), MAT.steel(), 0, 0.135, 0); g.add(sh);
  g.add(cyl(0.032, 0.1, MAT.steel(), -0.105, 0.1, 0, 12), cyl(0.032, 0.1, MAT.steel(), 0.105, 0.1, 0, 12));
}

/* ----- barrel ----- */
function buildBarrel(v) {
  const R = 1, HS = 0.9, tor = (y, r = 0.05) => { const t = mesh(new THREE.TorusGeometry(R + 0.015, r, 14, 80), MAT.steel(), 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
  const seg = g => { g.add(mesh(new THREE.CylinderGeometry(R, R, HS, 80), [MAT.enamel(), MAT.crude(), MAT.black()])); const rim = mesh(new THREE.TorusGeometry(R - 0.02, 0.022, 10, 80), MAT.steel(), 0, HS / 2, 0); rim.rotation.x = Math.PI / 2; g.add(rim); };
  const bottom = v.add(v.spin, { step: 3, pos: [0, -HS, 0], moves: [{ s: 3, y: -0.8 }], build: g => { seg(g); g.add(tor(-HS / 2, 0.06)); } });
  v.label(bottom, [0, 0, R + 0.02], 'scarcity', { show: 3 });
  const core = v.add(v.spin, { step: 4, pos: [0, 0, 0], moves: [{ s: 4, x: -1.75, z: 0.25 }], build: g => g.add(cyl(0.4, 0.72, MAT.crude(), 0, 0, 0)) });
  v.label(core, [0, -0.62, 0], 'it waits', { show: 4 });
  const mid = v.add(v.spin, { step: 3, pos: [0, 0, 0], build: g => { seg(g); g.add(tor(HS / 2), tor(-HS / 2)); } });
  v.label(mid, [0, 0, R + 0.02], 'ship + refine', { show: 3 });
  const top = v.add(v.spin, { step: 3, pos: [0, HS, 0], moves: [{ s: 3, y: 0.8 }], build: g => { seg(g); g.add(tor(HS / 2, 0.06)); } });
  v.label(top, [0, 0, R + 0.02], 'getting it out', { show: 3 });
  const lid = v.add(v.spin, { step: 2, pos: [0, HS * 1.5 + 0.02, 0], moves: [{ s: 2, y: 0.75 }, { s: 3, y: 0.95 }], build: g => { g.add(cyl(R * 0.975, 0.05, MAT.enamel(), 0, 0, 0, 80), cyl(0.13, 0.06, MAT.steel(), 0.45, 0.04, 0.3, 24), cyl(0.07, 0.06, MAT.steel(), -0.5, 0.04, -0.2, 24)); } });
  v.label(lid, [0, 0.38, 0], 'to the refinery', { show: 2 });
  v.add(v.spin, { step: 1, pos: [0, 0.02, 0], moves: [{ s: 1, x: -1.15, y: 0.95, z: 0.45 }, { s: 3, x: -0.5, y: 0.85 }], build: g => {
    const m = new THREE.MeshStandardMaterial({ map: textTex(words('BRENT'), 512, 200), roughness: 0.5 }); m.userData.noGlow = true;
    g.add(mesh(new THREE.CylinderGeometry(R + 0.014, R + 0.014, 0.4, 32, 1, true, -0.5, 1.0), m));
  } });
  const stamp = v.add(v.flat, { step: 5, pos: [1.72, -1.7, 0.3], fade: 5, from: { x: -0.5 }, build: g => g.add(plate(0.66, 0.32, words('2016'))) });
  v.label(stamp, [0, -0.36, 0], '= today');
  v.add(v.flat, { step: 6, pos: [1.75, 0.12, 0.3], fade: 6, from: { x: -0.5 }, build: g => g.add(plate(1.0, 0.38, words('$ public', { border: '#00a805' }))) });
  v.add(v.flat, { step: 8, pos: [1.75, -0.48, 0.3], fade: 8, from: { x: 0.4 }, build: padlock });
  v.add(v.flat, { step: 7, pos: [0, 4.05, 0], fade: 7, from: { y: -0.4 }, build: g => g.add(plate(1.9, 0.56, words('BRENT', { border: '#00a805' }))) });
  v.add(v.flat, { step: 9, pos: [0, -3.2, 0.2], fade: 9, from: { y: 0.5 }, build: g => g.add(plate(1.5, 0.44, words('bank loan'))) });
  const next = v.add(v.flat, { step: 10, pos: [0, -4.0, 0], fade: 10, build: () => {} });
  v.label(next, [0, 0, 0], 'next: gas, power, shipping');
  const whole = v.add(v.flat, { step: 0, pos: [0, -1.75, 0], build: () => {} });
  v.label(whole, [0, 0, 0], '1 barrel', { hide: 2 });
}

/* ----- data-center GPU module (original design) ----- */
function rbox(w, h, d, r = 0.06, b = 0.015) {
  const s = new THREE.Shape(), x = -w / 2 + b, z = -d / 2 + b, W = w - 2 * b, D = d - 2 * b, q = Math.max(r - b, 0.002);
  s.moveTo(x + q, z); s.lineTo(x + W - q, z); s.quadraticCurveTo(x + W, z, x + W, z + q); s.lineTo(x + W, z + D - q); s.quadraticCurveTo(x + W, z + D, x + W - q, z + D);
  s.lineTo(x + q, z + D); s.quadraticCurveTo(x, z + D, x, z + D - q); s.lineTo(x, z + q); s.quadraticCurveTo(x, z, x + q, z);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -(h - 2 * b) / 2); g.rotateX(Math.PI / 2); return g;
}
let BRUSH = null;
function brushTex() {
  if (BRUSH) return BRUSH;
  BRUSH = textTex((x, w, h) => {
    x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const y = Math.random() * h, l = 40 + Math.random() * 220, s = Math.random() * w; x.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.04 + Math.random() * 0.1})` : `rgba(0,0,0,${0.04 + Math.random() * 0.12})`; x.lineWidth = 0.6 + Math.random(); x.beginPath(); x.moveTo(s, y); x.lineTo(s + l, y); x.stroke(); }
  }, 512, 512);
  BRUSH.encoding = THREE.LinearEncoding; BRUSH.wrapS = BRUSH.wrapT = THREE.RepeatWrapping; return BRUSH;
}
function dieTex(seed, warm) {
  const t = textTex((x, w, h) => {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#10141d'; x.fillRect(0, 0, w, h);
    const cols = 4, rows = 5, gw = (w - 40) / cols, gh = (h - 60) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const bx = 20 + i * gw, by = 30 + j * gh, k = 30 + Math.floor(rnd() * 30);
      x.fillStyle = warm ? `rgb(${k + 52},${k + 26},${k + 8})` : `rgb(${k + 6},${k + 24},${k + 52})`; x.fillRect(bx + 3, by + 3, gw - 6, gh - 6);
      for (let n = 0; n < 26; n++) { const q = 20 + Math.floor(rnd() * 60); x.fillStyle = warm ? `rgba(${q + 90},${q + 50},${q},0.55)` : `rgba(${q},${q + 40},${q + 95},0.55)`; x.fillRect(bx + 4 + rnd() * (gw - 22), by + 4 + rnd() * (gh - 14), 3 + rnd() * 14, 2 + rnd() * 7); }
    }
    x.fillStyle = warm ? '#6a5a2a' : '#1f5f52'; x.fillRect(0, 0, w, 22); x.fillRect(0, h - 22, w, 22);
    x.fillStyle = '#2b3350'; x.fillRect(w / 2 - 4, 30, 8, h - 60);
  }, 256, 320);
  t.anisotropy = 4; return t;
}
function chipPackage(g, size, seed, warm) {
  const k = size, sub = MAT.pcb();
  g.add(mesh(rbox(1.0 * k, 0.03, 1.0 * k, 0.03, 0.008), sub));
  const stiff = brushedMat(0xa5aab1, 0.5);
  [[0, -0.45, 1.0, 0.09], [0, 0.45, 1.0, 0.09], [-0.455, 0, 0.09, 0.81], [0.455, 0, 0.09, 0.81]].forEach(([x, z, w, d]) => g.add(box(w * k, 0.014, d * k, stiff, x * k, 0.022, z * k)));
  g.add(box(0.78 * k, 0.02, 0.7 * k, (() => { const m = new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.85, roughness: 0.22 }); m.color.convertSRGBToLinear(); return m; })(), 0, 0.026, 0));
  const tex = dieTex(seed, warm), dm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.16, metalness: 0.8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 }); dm.userData.noGlow = true;
  g.add(box(0.4 * k, 0.012, 0.56 * k, dm, 0, 0.042, 0));
  const frame = MAT.glow();
  [[0, -0.287, 0.42, 0.008], [0, 0.287, 0.42, 0.008], [-0.207, 0, 0.008, 0.58], [0.207, 0, 0.008, 0.58]].forEach(([x, z, w, d]) => g.add(box(w * k, 0.006, d * k, frame, x * k, 0.04, z * k)));
  const tile = (() => { const m = new THREE.MeshStandardMaterial({ color: 0x24272c, metalness: 0.75, roughness: 0.26 }); m.color.convertSRGBToLinear(); return m; })();
  [-1, 1].forEach(sx => [-0.2, 0, 0.2].forEach(z => g.add(box(0.11 * k, 0.012, 0.17 * k, tile, sx * 0.3 * k, 0.042, z * k))));
  for (let i = 0; i < 22; i++) g.add(box(0.014 * k, 0.008, 0.014 * k, MAT.gold(), (-0.46 + i * 0.044) * k, -0.016, 0.495 * k));
}
const brushedMat = (hex, rough = 0.55) => { const m = new THREE.MeshStandardMaterial({ color: hex, metalness: 1, roughness: rough, roughnessMap: brushTex(), bumpMap: brushTex(), bumpScale: 0.0015 }); m.color.convertSRGBToLinear(); return m; };
function buildCard(v) {
  const Y = { lid: 0.44, fins: 0.04, cold: -0.37, die: -0.47, pcb: -0.56, back: -0.63 }, F = { lid: 2.6, fins: 1.6, cold: 0.62, die: -0.05, pcb: -0.8, back: -1.55 };
  const layer = (k, z, build, text) => { const p = v.add(v.spin, { step: 3, pos: [0, Y[k], 0], moves: [{ s: 3, y: F[k] - Y[k] }], build }); v.label(p, [0, 0, z], text, { show: 3 }); return p; };
  const anod = () => { const m = new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.92, roughness: 0.36 }); m.color.convertSRGBToLinear(); return m; };
  const mask = () => { const m = new THREE.MeshPhysicalMaterial({ color: 0x0b0e0d, metalness: 0.2, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35 }); m.color.convertSRGBToLinear(); return m; };
  layer('back', 1.06, g => g.add(mesh(rbox(2.62, 0.05, 2.06, 0.07, 0.014), brushedMat(0x4a4e55, 0.6))), 'building 14%');
  layer('pcb', 1.0, g => {
    g.add(mesh(rbox(2.5, 0.05, 1.95, 0.08, 0.012), mask()), box(1.3, 0.016, 0.07, MAT.gold(), 0.2, -0.012, 0.95), mesh(rbox(0.36, 0.16, 0.26, 0.03, 0.012), MAT.black(), -1.02, 0.1, 0.55));
    [[-1.12, -0.85], [1.12, -0.85], [-1.12, 0.85], [1.12, 0.85]].forEach(([x, z]) => g.add(cyl(0.05, 0.1, MAT.gold(), x, 0.07, z, 20)));
    for (let i = 0; i < 9; i++) g.add(mesh(rbox(0.15, 0.11, 0.15, 0.02, 0.008), brushedMat(0x5b5f66, 0.7), -0.72 + i * 0.2, 0.08, -0.8));
    for (let i = 0; i < 14; i++) g.add(cyl(0.036, 0.1, MAT.alu(), -0.55 + i * 0.115, 0.075, 0.78, 16));
    for (let i = 0; i < 4; i++) g.add(mesh(rbox(0.22, 0.03, 0.22, 0.01, 0.006), MAT.black(), -0.98 + (i % 2) * 1.96, 0.04, -0.3 + Math.floor(i / 2) * 0.5));
    for (let i = 0; i < 7; i++) g.add(box(0.012, 0.004, 0.36, MAT.glow(), -0.27 + i * 0.09, 0.027, 0.72));
    g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), MAT.glow(), -0.78, 0.045, 0.86), mesh(new THREE.SphereGeometry(0.022, 10, 8), MAT.glow(), -0.7, 0.045, 0.86));
  }, 'power 16%');
  layer('die', 0.56, g => chipPackage(g, 1.05, 7, false), 'hardware 42%');
  layer('cold', 0.7, g => {
    g.add(mesh(rbox(1.74, 0.07, 1.34, 0.06, 0.014), brushedMat(0xd4d7db, 0.4)), mesh(rbox(0.9, 0.03, 0.9, 0.04, 0.008), MAT.copper(), 0, -0.045, 0));
    [[-0.5, 0x1f63c4], [0.5, 0xc0392f]].forEach(([x, hex]) => {
      const hose = new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.1, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }); hose.color.convertSRGBToLinear();
      const curve = new THREE.CatmullRomCurve3([[x, 0.0, -0.6], [x, 0.03, -0.82], [x, 0.16, -1.0], [x * 1.25, 0.42, -1.1], [x * 1.7, 0.6, -1.12]].map(q => new THREE.Vector3(...q)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.05, 12, false), hose));
      const fit = cyl(0.066, 0.1, brushedMat(0xb9bdc4, 0.45), x, 0.0, -0.62, 20); fit.rotation.x = Math.PI / 2; g.add(fit);
    });
  }, 'financing 12%');
  layer('fins', 0.8, g => {
    g.add(mesh(rbox(1.9, 0.05, 1.5, 0.04, 0.012), anod(), 0, -0.34, 0));
    for (let i = 0; i < 58; i++) g.add(box(0.011, 0.66, 1.46, anod(), -0.9 + i * (1.8 / 57), 0, 0));
    [-0.955, 0.955].forEach(x => g.add(mesh(rbox(0.035, 0.72, 1.52, 0.012, 0.008), anod(), x, 0, 0)));
  }, 'running it 8%');
  layer('lid', 0.6, g => {
    g.add(mesh(rbox(1.52, 0.06, 1.12, 0.07, 0.016), brushedMat(0xb9bdc4, 0.5)));
    [[-0.66, -0.46], [0.66, -0.46], [-0.66, 0.46], [0.66, 0.46]].forEach(([x, z]) => g.add(cyl(0.04, 0.03, MAT.black(), x, 0.035, z, 6)));
    const mark = new THREE.MeshBasicMaterial({ map: textTex((x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#17181b'; x.font = `800 ${Math.round(h * 0.62)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DKW', w / 2, h / 2); }, 512, 200), alphaTest: 0.5 }); mark.userData.noGlow = true;
    const d = mesh(new THREE.PlaneGeometry(0.62, 0.24), mark, 0, 0.0315, 0); d.rotation.x = -Math.PI / 2; g.add(d);
  }, 'scarcity 8%');
  v.add(v.spin, { step: 1, pos: [0.45, 0.04, 0.775], moves: [{ s: 1, x: -0.2, y: 1.2, z: 0.4 }, { s: 3, x: -1.9, y: 1.7 }], rots: [{ s: 1, y: 0.55 }], build: g => g.add(plate(0.6, 0.3, words('B200'))) });
  const clock = v.add(v.spin, { step: 4, pos: [0.98, Y.lid + 0.36, -0.5], moves: [{ s: 3, y: 2.15 }, { s: 4, x: 0.3, y: 0.3 }], rots: [{ s: 3, y: 0.55 }], fadeOut: { s: 4, to: 0.38 }, build: g => {
    const rim = cyl(0.28, 0.06, MAT.steel(), 0, 0, 0); rim.rotation.x = Math.PI / 2; const face = cyl(0.245, 0.062, MAT.white(), 0, 0, 0.004); face.rotation.x = Math.PI / 2;
    g.add(rim, face, box(0.022, 0.17, 0.02, MAT.black(), 0, 0.08, 0.04), box(0.12, 0.022, 0.02, MAT.black(), 0.055, 0, 0.04));
  } });
  v.label(clock, [0, 0.44, 0], 'gone for good', { show: 4, cls: 'd', solid: true });
  const plug = v.add(v.spin, { step: 2, pos: [-1.45, Y.pcb + 0.1, 0.55], moves: [{ s: 2, x: -0.42 }, { s: 3, y: -1.45 }], build: g => {
    g.add(mesh(rbox(0.36, 0.17, 0.26, 0.03, 0.012), MAT.black()));
    [-0.08, 0, 0.08].forEach((z, i) => { const c = cyl(0.028, 0.9, i === 1 ? MAT.black() : MAT.gold(), -0.62, 0, z, 10); c.rotation.z = Math.PI / 2; g.add(c); });
  } });
  v.label(plug, [0.1, -0.3, 0], 'power in', { show: 2 });
  const fresh = v.add(v.spin, { step: 5, pos: [1.5, F.die + 0.02, 0.4], fade: 5, from: { x: 0.5 }, build: g => chipPackage(g, 0.62, 31, true) });
  v.label(fresh, [0, 0.34, 0], 'new chip', { cls: 'd' });
  const env = v.add(v.flat, { step: 6, pos: [1.42, -2.6, 0.3], fade: 6, from: { x: -0.5 }, build: g => g.add(plate(0.95, 0.58, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#000000'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
    x.beginPath(); x.moveTo(5, 5); x.lineTo(w / 2, h * 0.52); x.lineTo(w - 5, 5); x.stroke();
    x.fillStyle = '#ff5000'; x.font = `700 ${Math.round(h * 0.3)}px ${FONT}`; x.textAlign = 'center'; x.fillText('$ ?', w / 2, h * 0.88);
  })) });
  v.label(env, [0, -0.46, 0], 'private', { cls: 'd' });
  v.add(v.flat, { step: 8, pos: [0.5, -2.62, 0.3], fade: 8, from: { x: -0.4 }, build: padlock });
  v.add(v.flat, { step: 7, pos: [0, 4.05, 0], fade: 7, from: { y: -0.4 }, build: g => g.add(plate(1.9, 0.56, words('GPU INDEX', { border: '#00a805' }))) });
  const notes = v.add(v.flat, { step: 9, pos: [-0.7, -3.35, 0.2], fade: 9, from: { y: 0.5 }, build: g => g.add(mesh(rbox(1.4, 0.12, 0.5, 0.03, 0.012), MAT.green(), 0, 0.14, 0), mesh(rbox(1.4, 0.09, 0.5, 0.03, 0.012), MAT.alu(), 0, 0, 0), mesh(rbox(1.4, 0.07, 0.5, 0.03, 0.012), MAT.white(), 0, -0.11, 0)) });
  v.label(notes, [0, -0.36, 0.25], 'rated notes');
  const bot = v.add(v.flat, { step: 10, pos: [1.35, -3.8, 0.2], fade: 10, from: { x: 0.4 }, build: g => {
    g.add(mesh(rbox(0.34, 0.26, 0.26, 0.05, 0.014), MAT.alu(), 0, 0.3, 0), mesh(rbox(0.44, 0.36, 0.28, 0.05, 0.014), MAT.graphite(), 0, -0.04, 0), cyl(0.018, 0.12, MAT.steel(), 0, 0.49, 0, 8));
    [-0.08, 0.08].forEach(x => g.add(mesh(new THREE.SphereGeometry(0.035, 12, 8), MAT.glow(), x, 0.32, 0.135)));
    g.add(mesh(rbox(0.07, 0.26, 0.08, 0.02, 0.008), MAT.alu(), -0.27, -0.04, 0), mesh(rbox(0.07, 0.26, 0.08, 0.02, 0.008), MAT.alu(), 0.27, -0.04, 0));
  } });
  v.label(bot, [0, -0.42, 0], 'next: robot-hours');
  const whole = v.add(v.flat, { step: 0, pos: [0, -1.25, 0], build: () => {} });
  v.label(whole, [0, 0, 0], '1 GPU-hour', { hide: 2 });
}

function makeView(canvas, labelBox, cfg) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.environment = makeEnv(renderer);
  const key = new THREE.DirectionalLight(0xffffff, 1.25); key.position.set(3.5, 9, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -6, near: 1, far: 30 }); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 3; const rim = new THREE.DirectionalLight(0xcfe0ff, 1.7); rim.position.set(-5, 3, -6);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x101216, 0.18));
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  const v = { spin: new THREE.Group(), flat: new THREE.Group(), fans: [], pieces: [], labels: [] };
  scene.add(v.spin, v.flat);
  v.add = (parent, def) => {
    const g = new THREE.Group(); def.build(g); g.position.set(...def.pos); if (def.rot0) g.rotation.set(...def.rot0); parent.add(g);
    const mats = []; g.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; if (Array.isArray(o.material)) mats.push(...o.material); else mats.push(o.material); });
    const pc = { g, def, mats: [...new Set(mats)], base: g.position.clone(), rot: g.rotation.clone(), o: 1 }; v.pieces.push(pc); return pc;
  };
  v.label = (pc, pos, text, o = {}) => { const el = document.createElement('span'); el.className = 'chip' + (o.cls ? ' ' + o.cls : ''); el.textContent = text; labelBox.appendChild(el); v.labels.push({ el, pc, pos: new THREE.Vector3(...pos), show: o.show, hide: o.hide, solid: o.solid }); };
  cfg.build(v);
  let drag = 0, held = false, lastX = 0;
  canvas.addEventListener('pointerdown', ev => { held = true; lastX = ev.clientX; canvas.setPointerCapture(ev.pointerId); });
  canvas.addEventListener('pointermove', ev => { if (!held) return; drag = clamp(drag + (ev.clientX - lastX) * 0.01, -1.4, 1.4); lastX = ev.clientX; onScroll(); });
  const release = () => { held = false; }; canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  let W = 0, H = 0;
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (w === W && h === H || !w || !h) return; W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  const tmp = new THREE.Vector3();
  v.update = (e, p, now, atEnd, filter, tags, t, dt) => {
    size(); if (!W) return;
    v.pieces.forEach(pc => {
      const d = pc.def; let x = pc.base.x, y = pc.base.y, z = pc.base.z, o = 1, rx = pc.rot.x, ry = pc.rot.y;
      (d.moves || []).forEach(m => { const k = e(m.s); x += k * (m.x || 0); y += k * (m.y || 0); z += k * (m.z || 0); });
      (d.rots || []).forEach(m => { const k = e(m.s); rx += k * (m.x || 0); ry += k * (m.y || 0); });
      if (d.fade !== undefined) { const k = e(d.fade); o = k; if (d.from) { x += (1 - k) * (d.from.x || 0); y += (1 - k) * (d.from.y || 0); } }
      if (d.fadeOut) o *= 1 - e(d.fadeOut.s) * (1 - d.fadeOut.to);
      if (atEnd && filter !== 'all' && d.step > 0 && tags[d.step] !== filter) o *= 0.1;
      pc.g.position.set(x, y, z); pc.g.rotation.x = rx; pc.g.rotation.y = ry; pc.o = o; pc.g.visible = o > 0.015;
      const on = !atEnd && d.step === now && now > 0 && now !== 3;
      pc.mats.forEach(m => { m.transparent = o < 0.995; m.opacity = o; if (!m.userData.noGlow && m.emissive) { m.emissive.setHex(on ? 0x003d02 : 0x000000); } });
    });
    v.fans.forEach(f => { f.rotation.y += dt * 2.4 * (1 - 0.85 * e(3)); });
    v.spin.rotation.y = cfg.rotY + (p / 11 - 0.5) * cfg.turn + drag;
    const k1 = e(1), k3 = e(3), vh = lerp(lerp(cfg.h[0], cfg.h[1], k1), cfg.h[2], k3), vw = lerp(lerp(cfg.w[0], cfg.w[1], k1), cfg.w[2], k3);
    const vis = Math.max(vh, vw / cam.aspect), dist = vis / 2 / Math.tan(cam.fov * Math.PI / 360);
    cam.position.set(0, dist * Math.sin(cfg.elev), dist * Math.cos(cfg.elev)); cam.lookAt(0, 0, 0);
    scene.updateMatrixWorld(); cam.updateMatrixWorld();
    v.labels.forEach(l => {
      let o = l.solid ? Math.min(1, l.pc.o / 0.38) : l.pc.o; if (l.show !== undefined) o *= e(l.show); if (l.hide !== undefined) o *= 1 - e(l.hide);
      if (o < 0.02) { l.el.style.visibility = 'hidden'; return; }
      tmp.copy(l.pos); l.pc.g.localToWorld(tmp); tmp.project(cam);
      l.el.style.visibility = 'visible'; l.el.style.opacity = o.toFixed(2);
      l.el.style.transform = `translate(-50%, -50%) translate(${((tmp.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * H).toFixed(1)}px)`;
    });
    renderer.render(scene, cam);
  };
  return v;
}

/* ---------- scroll drives the dissection: piece i lets go as you approach step i ---------- */
let views = null;
function initGL() {
  try {
    views = [
      makeView(document.getElementById('cOil'), document.getElementById('lOil'), { build: buildBarrel, rotY: 0, turn: 0.5, elev: 0.24, h: [4.4, 6.6, 9.8], w: [3.0, 4.4, 4.8] }),
      makeView(document.getElementById('cGpu'), document.getElementById('lGpu'), { build: buildCard, rotY: -0.6, turn: 0.35, elev: 0.5, h: [3.4, 6.6, 9.8], w: [3.9, 4.8, 5.0] }),
    ];
  } catch (err) { views = null; ROOT.classList.remove('gl'); }
  onScroll();
}

const TAGLIST = STEPS.map(s => s.tag);
let active = -1, last = 0, inView = true;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  const p = clamp(-scrolly.getBoundingClientRect().top / window.innerHeight, 0, N - 1);
  const e = i => i <= 0 ? 1 : ease(clamp((p - (i - 0.8)) / 0.65, 0, 1));
  const now = Math.round(p), atEnd = now === N - 1;
  if (views) views.forEach(v => v.update(e, p, now, atEnd, filter, TAGLIST, t, dt)); else updateSvg(e, now, atEnd);
  if (now !== active) {
    active = now;
    cards.forEach((c, i) => { c.classList.toggle('on', i === now); c.setAttribute('aria-hidden', String(i !== now)); });
    dots.forEach((d, i) => { d.classList.toggle('on', i <= now); d.classList.toggle('cur', i === now); if (i === now) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
  }
}
function updateSvg(e, now, atEnd) {
  nodes.forEach(({ g, def }) => {
    let x = 0, y = 0, o = 1;
    def.moves.forEach(m => { const k = e(m.s); x += k * (m.dx || 0); y += k * (m.dy || 0); });
    if (def.fade !== undefined) { const k = e(def.fade); o = k; if (def.from) { x += (1 - k) * (def.from.dx || 0); y += (1 - k) * (def.from.dy || 0); } }
    if (def.fadeOut) { const k = e(def.fadeOut.s); o *= 1 - k * (1 - def.fadeOut.to); g.classList.toggle('gone', k > 0.5); }
    if (atEnd && filter !== 'all' && def.step > 0 && STEPS[def.step].tag !== filter) o *= 0.18;
    g.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`); g.style.opacity = f1(o * 100) / 100;
    g.classList.toggle('active', !atEnd && def.step === now && now > 0);
  });
  shows.forEach(n => { n.style.opacity = e(+n.dataset.show); });
  hides.forEach(n => { n.style.opacity = 1 - e(+n.dataset.hide); });
}
function update() { frame(performance.now()); }
window.addEventListener('keydown', ev => {
  if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
  if (ev.target.closest && ev.target.closest('button, a, input')) return;
  const to = clamp(active + (ev.key === 'ArrowRight' ? 1 : -1), 0, N - 1);
  window.scrollTo({ top: scrolly.getBoundingClientRect().top + window.scrollY + to * window.innerHeight, behavior: reduced ? 'auto' : 'smooth' }); ev.preventDefault();
});
let queued = false;
const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(t => { queued = false; frame(t); }); } };
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
if (window.THREE) {
  ROOT.classList.add('gl');
  const ready = document.fonts && document.fonts.load ? Promise.race([Promise.all([document.fonts.load('700 20px "DM Sans"'), document.fonts.load('800 20px "DM Sans"')]), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
  ready.then(initGL, initGL);
}
update();
})();
