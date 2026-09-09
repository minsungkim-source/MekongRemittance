/* The reading and interaction layer, carried over from the single-file build.
   It is deliberately not decomposed into components yet: every behaviour in
   here -- five metrics across five corridors, the evidence toggle, the
   sixteen-month slider, keyboard sorting, the withheld quarters -- was
   verified against the live page, and rewriting it as hooks in the same pass
   as the framework move would have meant re-verifying all of it at once.
   Ported as one module first; decomposition is the next step, not this one.

   What did change: the globals it used to read off `window` (DATA, gsap,
   ScrollTrigger, Lenis) are arguments now, so nothing depends on script order
   or on a shared global lexical scope. The WebGL scene it used to build by
   hand is an R3F component; this module publishes the scroll scalar and the
   component subscribes. */
export function initApp({DATA, gsap, ScrollTrigger, Lenis, setProgress, setMassing, setGeom}) {
  // (a module is strict already, and a destructured parameter list forbids the
  //  directive the single-file build carried here)


  /* ── Mekong Remittance Corridors ─────────────────────────────────────
     Everything the reader sees is derived here from the embedded dataset.
     The corridor split is a model, so it is computed in the browser: the
     assumption sliders have to move the numbers, and the reader has to be
     able to see the whole calculation from the inputs shown on screen.   */

  const Q = DATA.meta.quarters;                      // "2005Q1" .. "2025Q4"
  const PT = DATA.pt.payments;                       // million baht, per quarter
  const DQ = DATA.doe.quarters;                      // work-permit stock + share
  const NATS = DATA.corridors.map(c => c.code);
  const PROV = new Set(DATA.meta.provisional);
  const qi = {}; Q.forEach((q, i) => qi[q] = i);
  const yearOf = q => +q.slice(0, 4), qnOf = q => +q.slice(5);

  /* ── language ────────────────────────────────────────────────────────
     Every visible string lives in this table, so nothing is stranded in the
     markup where it cannot be found again.                              */
  const STR = {
    stamp: 'data',
    h1: 'Thailand pays out. Where does it land, and when?',
    dek: 'Millions of people from Myanmar, Cambodia, Laos and Viet Nam work in Thailand and send money home. This page follows that money using two public records: the Bank of Thailand’s quarterly total for money individuals send abroad, and the labour ministry’s monthly count of foreign work permits, province by province. <b>How much leaves Thailand, and when in the year, is measured.</b> How much goes to each country is an <b>estimate</b> — and every number here says which of the two it is.',
    fCorridor: 'corridor', fMetric: 'metric', fGrade: 'evidence',
    fAssume: 'Assumptions behind the corridor split',
    all: 'Thailand, all destinations',
    mSi: 'Seasonal index', mLevel: 'Flow per quarter', mShare: 'Corridor share',
    mWorker: 'Per worker, per month', mYoy: 'Year on year',
    gAll: 'Show modelled', gMeasured: 'Measured only',
    /* The chips are labelled with the action they perform; the status line has
       to say which state the page is in instead. */
    stAll: 'measured and modelled', stMeasured: 'measured only',
    roOver: 'over', roSheet: 'the drafting sheet', roSheetLabel: 'sheet',
    roQuarter: 'quarter', roProvince: 'province', roCorridor: 'corridor',
    roWithheld: '· withheld',
    hiddenModelled: 'Hidden. Every figure in this panel is modelled, and this view shows only what the sources state directly.',
    boardSi: 'Seasonal index by quarter', boardLevel: 'Flow by quarter',
    boardShare: 'Corridor share by quarter', boardWorker: 'Per worker per month',
    boardYoy: 'Year-on-year change',
    chartTitle: 'Personal transfers paid abroad, quarterly',
    flowTitle: 'Where it goes', rankTitle: 'Corridors by modelled flow',
    ctxTitle: 'What the receiving countries report',
    tblTitle: 'Every quarter', tblHint: 'click a column to sort',
    yearCol: 'year', totalCol: 'year',
    legLo: 'below trend', legMid: 'shading is distance from the four-quarter trend',
    legHi: 'above trend',
    legLoSeq: 'smaller', legMidSeq: 'shading is size within the series', legHiSeq: 'larger',
    selected: 'Selected quarter',
    emptyDetail: 'Pick a quarter in the grid to see the figures behind the cell.',
    measuredBanner: 'Measured only is on. The corridor split is a model, so it is hidden — what remains is what the public statistics state directly.',
    corridorBanner: q => `Corridor figures exist only where the work-permit table holds a usable run of months: ${q}. Everywhere else the grid is empty on purpose.`,
    windowNote: '○ one-sided window — no later quarters exist yet, so the trend is the trailing four quarters',
    provNote: '· provisional in the source',
    gradeA: 'measured', gradeB: 'modelled',
    poolLabel: 'Share of Thailand’s outflow going to these four countries',
    propLabel: c => `${c} — sends per worker, relative to the average`,
    assumeHint: 'The corridor split takes the measured national outflow, keeps the share of it assumed to go to these four countries, and divides that by each nationality\u2019s share of the work-permit population, times a per-worker factor. Both are assumptions, not findings. <b>The pool share cannot be observed</b> \u2014 the balance of payments has no country breakdown \u2014 and two things pull it in opposite directions: these four nationalities are about nine in ten of all work-permit holders, but they earn far less per head than the remaining tenth, and a 2024 World Bank/ILO survey of 1,770 of them found under 15% remit by bank transfer (10% among Lao workers), so much of what they send never reaches the balance of payments at all. 0.70 is a round number between those two pulls, not a measurement. <b>The per-worker factors are left neutral</b> because no current survey publishes a per-nationality amount: the 2024 survey shows it only as a chart, and the one source that prints it as text is an ILO report from 2010 (a median of about 30,000 baht over two years for Myanmar against 20,000 for Cambodia) whose ordering that same 2024 survey says has since changed. Move both and watch how much the answer depends on them.',
    boardHintSi: 'The index is the quarter divided by the centred four-quarter average around it: 1.00 means the quarter sat exactly on its own local trend. Across the whole series Q1 is the strongest quarter and Q3 the weakest — the opposite of what a Songkran-driven story would predict — and the median row at the foot of the grid is that summary. Read a single year with care: the division removes the level but not a change in the growth rate, so 2024 and 2025 are pushed upward at the back end by acceleration rather than by season. Quarters with no successors yet are left empty, because a centred window does not exist for them.',
    boardHintOther: 'Shading runs from the smallest to the largest value in the series on screen. Exact figures are in the table at the foot of the page.',
    identityNote: 'While every per-worker factor is left at the same value, the per-worker figure is identical for all four corridors — not a finding but an arithmetic consequence of assuming no difference in sending behaviour. Move the factors apart to make it say something.',
    workerHint: 'This divides the modelled corridor flow by the corridor’s work-permit count. With the per-worker factors equal, it returns the same number for every corridor by construction; it only separates them once you set the factors apart.',
    chartHint: n => `The measured series, ${n} quarters. The dashed line is the selected corridor under the current assumptions.`,
    flowHint: 'Latest quarter with a usable work-permit reading. Widths are modelled, so they move with the sliders.',
    rankHint: 'Modelled flow summed over the most recent usable run of the work-permit table.',
    ctxHint: 'Remittances each country reports receiving from the whole world, not from Thailand alone. Shown so the modelled corridor can be sized against something independent.',
    cols: ['quarter', 'paid abroad', 'seasonal index', 'workers', 'share', 'modelled flow', 'per worker'],
    unitMB: 'm฿', unitBn: 'bn ฿', workers: 'workers', regime: 'run',
    dPaid: 'Paid abroad, all destinations', dSi: 'Seasonal index', dShare: 'Share of the four',
    dFlow: 'Modelled corridor flow', dWorkers: 'Work permits held', dWorker: 'Per worker, per month',
    dYoy: 'Change on a year earlier', dRegime: 'Source run',
    ab: ['What this is', 'How the corridor split is built', 'Sources, and what was not obtained', 'Reading it without being misled'],
    ab1: [
      'Thailand is a net remitter. Its balance of payments records what leaves as <b>personal transfers</b> — household-to-household money, which is where the wages of migrant workers from Myanmar, Cambodia, Laos and Viet Nam go home. The Bank of Thailand publishes that line quarterly, and it is the one number on this page that is measured, national, and unambiguous.',
      'The page pairs it with the Department of Employment’s monthly count of work permits — by nationality, and by province, which is where the map comes from — and with what the four receiving countries report taking in. From those it estimates how the Thai outflow divides between the corridors, and marks that estimate as an estimate everywhere it appears.',
      '<b>What it cannot do:</b> measure informal channels, price a corridor, or tell you a month. Money carried home by hand or moved through hundi never enters the balance of payments, so every flow figure here is a <b>formal-channel</b> figure and an undercount of the real one.'],
    ab2: [
      'Three steps, and the first is the only measured one.',
      '<b>1 — the national flow.</b> Bank of Thailand, secondary income, payments, line 2.1 Personal transfers. Quarterly, million baht, back to 2005. Taken as published.',
      '<b>2 — the pool.</b> The balance of payments has no country breakdown, so the share of that outflow going to these four countries is an assumption, set on the slider. It is not observable from any public source.',
      '<b>3 — the split.</b> Each corridor gets the pool times its share of the work-permit population, times a per-worker factor. Shares come from the work-permit table; the factors default to 1.00, meaning no assumed difference in sending behaviour.',
      'The seasonal index is the quarter over the centred four-quarter average around it. Applied to the national series it is measured. Applied to a corridor it inherits the model, and it is only computed inside a single run of the source table — never across a boundary, because a boundary is a change in what the table counts, not a change in migration.'],
    ab4: [
      '<b>The work-permit count is not a migration series.</b> Its level jumps whenever a cabinet resolution opens a registration window or the report changes which columns it prints, and its unit switched from positions to persons partway through. The page cuts it into runs at every such step and refuses to join them. The big moves in that series are policy, not people.',
      '<b>Myanmar is understated in the most recent run.</b> From May 2025 the source table stops carrying the renewal cases still in process — roughly 1.8 million people, almost all Myanmar nationals. Corridor shares from that run therefore understate Myanmar and overstate the rest.',
      '<b>The seasonal reading is quarterly, and that is a limit, not a choice.</b> The monthly balance-of-payments table reports services, primary income and secondary income as a single combined line, so personal transfers cannot be separated month by month. A monthly corridor series would have to be invented, so none is shown.',
      '<b>The festival markers are annotation, not input.</b> They are printed against the quarters so you can judge the alignment yourself. Feeding them into the estimate and then reading the result as evidence that festivals drive remittances would be circular, so they are kept out of the calculation.',
      '<b>Two readings of the same reports have to agree.</b> The national count by nationality and the province tables come from the same monthly PDFs but from different tables, read by different code. Where they disagree by more than a fifth the month is withheld instead of published — one of the two readings is wrong and which one is not always obvious. That is why some quarters here show a national flow but no corridor split at all.',
      '<b>Much of this money never enters the balance of payments.</b> The 2024 World Bank/ILO survey of 1,770 CLM migrant workers found fewer than 15% of them remit by bank transfer — 10% among Lao workers — with most of the rest going by hundi or as cash carried home. The Bank of Thailand series counts transfers through the formal system, so \'how much leaves Thailand\' here means how much leaves through recorded channels. The true flow is larger by a margin nobody has measured.',
      '<b>Registered workers only.</b> Undocumented workers are absent from the denominator, which pushes the per-worker figure up.'],
    festTh: 'Songkran', festQ2: 'new year', festPchum: 'Pchum Ben', festTet: 'Tet',
    festThad: 'Thadingyut', festLao: 'That Luang',
    fPeak: 'strongest quarter', fTrough: 'weakest', fLargest: 'largest corridor',
    fSince2016: 'strongest quarter, since 2016', fQuarters: 'measured quarters',
    mapTitle: 'Where the money leaves from',
    mChangeProv: 'Change in run', monthLabel: 'month', monthsWord: n => `${n} month${n === 1 ? '' : 's'}`,
    mMassing: 'Massing',
    massNote: 'Scroll the sheet and the plan lies back into axonometric, raising a column on every province — the same measured figure the fill carries, read as height instead of tone. Turn it off to keep the drawing flat.',
    legFell: 'fell', legRose: 'rose',
    mWorkersProv: 'Work permits', mShareProv: 'Share of the province',
    mapHint: (n, m, cov, rej, pub) => `Work-permit holders by province, ${m}. ${n} of 77 provinces carry a figure. These tables cover four of the permit categories, not all of them, so the province sum reaches ${cov} of the national count by nationality — the remainder sits in categories the report does not break down by province. ${pub} month${pub === 1 ? '' : 's'} reconcile closely enough to publish and ${rej} were rejected; the reasons are in the source table above. The slider moves inside that set, and change is only ever measured against the first month of the same run.`,
    medianRow: 'median',
    none: '—', noRun: 'no usable run',
  };
  const T = k => STR[k];
  const cname = c => c.en;

  /* ── state, kept in the URL so a view can be sent to someone ───────── */
  const METRICS = ['si', 'level', 'share', 'worker', 'yoy'];
  const state = {
    corridor: 'ALL', metric: 'si', measuredOnly: false, sel: null,
    pool: 0.70, prop: {MM: 1, KH: 1, LA: 1, VN: 1}, province: null,
    sortKey: null, sortDir: -1,
  };

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    // A fragment is a link somebody was handed: it may have been hand-edited,
    // truncated by a chat client, or written by an older build whose codes have
    // since changed. Unknown values used to be taken at face value, and the
    // damage was not graceful -- `c=XX` left every corridor chip unpressed and
    // rendered all 68 cells of the seasonality board as em-dashes, with nothing
    // on the page to say why. Anything the data does not recognise is dropped,
    // so a stale link opens the default view and writeHash then cleans the URL.
    if (['ALL'].concat(NATS).includes(p.get('c'))) state.corridor = p.get('c');
    if (METRICS.includes(p.get('m'))) state.metric = p.get('m');
    if (p.get('g') === 'm') state.measuredOnly = true;
    if (p.get('pool')) state.pool = Math.min(1, Math.max(0.2, +p.get('pool') || 0.7));
    NATS.forEach(n => { const v = p.get('p' + n); if (v) state.prop[n] = Math.min(2, Math.max(0.4, +v || 1)); });
    if (Q.includes(p.get('q'))) state.sel = p.get('q');
    // the map module is already initialised by the time this runs
    if (p.get('pm') && PV.months && PV.months[p.get('pm')]) mapMonth = p.get('pm');
    if (['workers', 'share', 'change'].includes(p.get('pv'))) mapMetric = p.get('pv');
    if (p.get('flat') === '1') massMode = 'flat';
    if (PV_BY_CODE[p.get('p')]) state.province = p.get('p');
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.corridor !== 'ALL') p.set('c', state.corridor);
    if (state.metric !== 'si') p.set('m', state.metric);
    if (state.measuredOnly) p.set('g', 'm');
    if (state.pool !== 0.7) p.set('pool', state.pool.toFixed(2));
    NATS.forEach(n => { if (state.prop[n] !== 1) p.set('p' + n, state.prop[n].toFixed(2)); });
    if (state.sel) p.set('q', state.sel);
    if (typeof mapMonth === 'string' && PV_KEYS.length && mapMonth !== PV_KEYS[PV_KEYS.length - 1])
      p.set('pm', mapMonth);
    if (mapMetric !== 'workers') p.set('pv', mapMetric);
    if (massMode === 'flat') p.set('flat', '1');
    if (state.province) p.set('p', state.province);
    history.replaceState(null, '', p.toString() ? '#' + p : location.pathname);
  }

  /* ── the model ───────────────────────────────────────────────────────
     alpha  = share of work permits x per-worker factor, renormalised
     flow   = pool x national outflow x alpha            [million baht]
     Only quarters where the work-permit table has a usable run get a value. */
  function alphaOf(q) {
    const d = DQ[q];
    if (!d) return null;
    let tot = 0;
    const w = {};
    NATS.forEach(n => { w[n] = (d.share[n] || 0) * state.prop[n]; tot += w[n]; });
    if (!tot) return null;
    const out = {};
    NATS.forEach(n => out[n] = w[n] / tot);
    return out;
  }
  function flowOf(q, c) {
    const a = alphaOf(q);
    if (!a || PT[q] == null) return null;
    return state.pool * PT[q] * a[c];
  }
  function perWorker(q, c) {
    const f = flowOf(q, c), d = DQ[q];
    if (f == null || !d || !d.stock[c]) return null;
    return f * 1e6 / d.stock[c] / 3;
  }

  /* series for the currently selected corridor + metric, keyed by quarter */
  function seriesFor(metric, corridor) {
    const out = {};
    Q.forEach(q => {
      let v = null;
      if (corridor === 'ALL') {
        if (metric === 'level' || metric === 'si' || metric === 'yoy') v = PT[q];
        else if (metric === 'share') v = 1;
        else if (metric === 'worker') {
          const d = DQ[q];
          if (d) {
            const st = NATS.reduce((s, n) => s + d.stock[n], 0);
            if (st) v = state.pool * PT[q] * 1e6 / st / 3;
          }
        }
      } else {
        if (metric === 'share') { const a = alphaOf(q); v = a ? a[corridor] : null; }
        else if (metric === 'worker') v = perWorker(q, corridor);
        else v = flowOf(q, corridor);
      }
      if (v != null && isFinite(v)) out[q] = v;
    });
    return out;
  }

  /* Regime label per quarter. The national balance-of-payments series is one
     continuous run; only the corridor series inherits the work-permit table's
     breaks, and a moving average must never cross one. */
  const regimeOf = (q, corridor) =>
    corridor === 'ALL' ? 'NAT' : (DQ[q] ? DQ[q].regime : null);

  /* Seasonal index: the quarter over the centred four-quarter average around it.
     A quarter with no successors yet cannot have a centred window, and a trailing
     window sits a quarter and a half in the past -- on a series growing as fast
     as this one that reads as seasonality. So those quarters stay empty. */
  function seasonalIndex(ser, corridor) {
    const out = {}, kind = {};
    const ok = (a, b) => regimeOf(a, corridor) && regimeOf(a, corridor) === regimeOf(b, corridor);
    Q.filter(q => ser[q] != null).forEach(q => {
      const i = qi[q];
      const win = [-2, -1, 0, 1, 2].map(d => Q[i + d]);
      if (!win.every(k => k && ser[k] != null && ok(k, q))) return;
      const ma = (0.5 * ser[win[0]] + ser[win[1]] + ser[win[2]] + ser[win[3]] + 0.5 * ser[win[4]]) / 4;
      if (ma) { out[q] = ser[q] / ma; kind[q] = 'c'; }
    });
    return {v: out, kind};
  }
  function yoy(ser, corridor) {
    const out = {};
    Q.forEach(q => {
      const p = Q[qi[q] - 4];
      if (p && ser[p] && ser[q] != null && regimeOf(p, corridor) === regimeOf(q, corridor))
        out[q] = ser[q] / ser[p] - 1;
    });
    return out;
  }

  /* ── formatting ──────────────────────────────────────────────────────── */
  const nf = (v, d) => v == null || !isFinite(v) ? T('none')
    : v.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
  const pct = (v, d) => v == null ? T('none') : (v * 100).toFixed(d === undefined ? 1 : d) + '%';
  const bn = v => v == null ? T('none') : nf(v / 1000, 1) + ' ' + T('unitBn');
  const mb = v => v == null ? T('none') : nf(v, 0);
  const sgn = v => v == null ? T('none') : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';

  const METRIC_DEF = {
    si:     {label: 'mSi',     title: 'boardSi',     diverging: true,  fmt: v => v.toFixed(2)},
    level:  {label: 'mLevel',  title: 'boardLevel',  diverging: false, fmt: v => nf(v / 1000, 1)},
    share:  {label: 'mShare',  title: 'boardShare',  diverging: false, fmt: v => (v * 100).toFixed(1)},
    worker: {label: 'mWorker', title: 'boardWorker', diverging: false, fmt: v => nf(v, 0)},
    yoy:    {label: 'mYoy',    title: 'boardYoy',    diverging: true,  fmt: v => (v * 100).toFixed(0)},
  };

  /* ── colour bins ─────────────────────────────────────────────────────── */
  const DIV_SI = [0.94, 0.98, 1.02, 1.06];
  const DIV_YOY = [-0.10, -0.02, 0.06, 0.18];
  function binner(metric, vals) {
    if (metric === 'si')  return v => 1 + DIV_SI.filter(e => v > e).length;
    if (metric === 'yoy') return v => 1 + DIV_YOY.filter(e => v > e).length;
    const s = vals.slice().sort((a, b) => a - b);
    if (!s.length) return () => 3;
    const q = k => s[Math.min(s.length - 1, Math.round(k * (s.length - 1)))];
    const e = [q(0.2), q(0.4), q(0.6), q(0.8)];
    return v => 1 + e.filter(x => v > x).length;
  }
  const cls = (metric, b) => (METRIC_DEF[metric].diverging ? 'b' : 'q') + b;

  /* ── festival annotations, printed against the quarters ──────────────── */
  function festLabel(qn) {
    const who = state.corridor === 'ALL' ? null : state.corridor;
    const rows = DATA.festivals.filter(f => f.q === qn && (!who || f.code === who || f.code === 'TH'));
    if (!rows.length) return '';
    const seen = new Set();
    const names = [];
    rows.forEach(f => {
      const k = f.en.includes('new year') ? (f.code === 'TH' ? 'festTh' : 'festQ2')
        : f.en.includes('Pchum') ? 'festPchum' : f.en.includes('Tet') ? 'festTet'
        : f.en.includes('Thadingyut') ? 'festThad' : f.en.includes('That Luang') ? 'festLao' : null;
      if (k && !seen.has(k)) { seen.add(k); names.push(T(k)); }
    });
    return names.slice(0, 2).join(' · ');
  }

  /* ── render: masthead ────────────────────────────────────────────────── */
  function renderFacts() {
    const last = Q[Q.length - 1];
    const y = yearOf(last);
    const annual = [1, 2, 3, 4].map(n => PT[`${y}Q${n}`]).filter(v => v != null);
    const prevAnnual = [1, 2, 3, 4].map(n => PT[`${y - 1}Q${n}`]).filter(v => v != null);
    // Use the whole-series factors so this agrees with the grid's median row.
    const sf = DATA.seasonal.payments_all;
    const sfr = DATA.seasonal.payments_2016;
    const peak = Object.entries(sf).sort((a, b) => b[1] - a[1])[0];
    const trough = Object.entries(sf).sort((a, b) => a[1] - b[1])[0];
    const peakR = Object.entries(sfr).sort((a, b) => b[1] - a[1])[0];
    const dqk = Object.keys(DQ).sort();
    const lastDQ = dqk[dqk.length - 1];
    const st = lastDQ ? NATS.reduce((s, n) => s + DQ[lastDQ].stock[n], 0) : null;
    const a = lastDQ ? alphaOf(lastDQ) : null;
    const top = a ? NATS.map(n => [n, a[n]]).sort((x, y2) => y2[1] - x[1])[0] : null;
    const cObj = top ? DATA.corridors.find(c => c.code === top[0]) : null;

    const F = [
      [T('dPaid'), bn(PT[last]), last + (PROV.has(last) ? ' · p' : '')],
      [T('mYoy'), annual.length === 4 && prevAnnual.length === 4
        ? sgn(annual.reduce((s, v) => s + v, 0) / prevAnnual.reduce((s, v) => s + v, 0) - 1) : T('none'),
        `${y} / ${y - 1}`],
      [T('fPeak'), peak[0] + '  ' + peak[1].toFixed(2),
        `${T('fTrough')} ${trough[0]} ${trough[1].toFixed(2)} · ${Q[0].slice(0, 4)}–${Q[Q.length - 1].slice(0, 4)}`],
      [T('dWorkers'), st ? nf(st, 0) : T('none'), lastDQ ? `${lastDQ} · ${T('regime')} ${DQ[lastDQ].regime}` : ''],
      [T('fLargest'), cObj ? cname(cObj) + '  ' + pct(top[1]) : T('none'), T('gradeB')],
      [T('fSince2016'), peakR[0] + '  ' + peakR[1].toFixed(2),
        `${Q.length} ${T('fQuarters')} · ${Q[0]} – ${Q[Q.length - 1]}`],
    ];
    document.getElementById('facts').innerHTML = F.map(
      ([k, v, s]) => `<div class="fact"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('');
  }

  /* ── render: controls ────────────────────────────────────────────────── */
  function chip(label, on, attrs, dim) {
    return `<button class="chip${dim ? ' dim' : ''}" aria-pressed="${on}"`
      + `${dim ? ' disabled' : ''} ${attrs || ''}>${label}</button>`;
  }
  function renderControls() {
    document.getElementById('cChips').innerHTML =
      chip(T('all'), state.corridor === 'ALL', 'data-c="ALL"') +
      DATA.corridors.map(c => chip(cname(c), state.corridor === c.code, `data-c="${c.code}"`)).join('');
    document.getElementById('mChips').innerHTML = METRICS.map(
      m => chip(T(METRIC_DEF[m].label), state.metric === m, `data-m="${m}"`)).join('');
    document.getElementById('gChips').innerHTML =
      chip(T('gAll'), !state.measuredOnly, 'data-g="all"') +
      chip(T('gMeasured'), state.measuredOnly, 'data-g="m"');

    /* Each dial's name sat beside it in a label with nothing tying the two
       together, so assistive technology announced six anonymous sliders. And
       the raw value is meaningless read aloud -- the pool dial is a percentage
       and the corridor dials are multipliers -- so each carries the same text
       the panel prints next to it. */
    const rows = [`<div class="w"><label for="dPool">${T('poolLabel')}</label><div class="r">
        <input type="range" id="dPool" min="20" max="100" step="1" value="${Math.round(state.pool * 100)}"
          aria-valuetext="${Math.round(state.pool * 100)}%" data-pool>
        <span class="pv">${Math.round(state.pool * 100)}%</span></div></div>`];
    DATA.corridors.forEach(c => rows.push(`<div class="w"><label for="dProp${c.code}">${T('propLabel')(cname(c))}</label><div class="r">
        <input type="range" id="dProp${c.code}" min="40" max="200" step="5" value="${Math.round(state.prop[c.code] * 100)}"
          aria-valuetext="${state.prop[c.code].toFixed(2)} times the average" data-prop="${c.code}">
        <span class="pv">${state.prop[c.code].toFixed(2)}×</span></div></div>`));
    document.getElementById('agrid').innerHTML = rows.join('');
    document.getElementById('lAssume').textContent = T('fAssume');
    document.getElementById('lAssumeHint').innerHTML = T('assumeHint');
    ['lCorridor:fCorridor', 'lMetric:fMetric', 'lGrade:fGrade'].forEach(p => {
      const [id, key] = p.split(':');
      document.getElementById(id).textContent = T(key);
    });
  }

  /* ── render: the board ───────────────────────────────────────────────── */
  let VIEW = {ser: {}, kind: {}, metric: 'si'};
  function renderBoard() {
    const md = METRIC_DEF[state.metric];
    const hidden = state.measuredOnly && state.corridor !== 'ALL';
    const modeBanner = state.measuredOnly;
    let ser = {}, kind = {};
    if (!hidden) {
      const base = seriesFor(state.metric, state.corridor);
      if (state.metric === 'si') { const r = seasonalIndex(base, state.corridor); ser = r.v; kind = r.kind; }
      else if (state.metric === 'yoy') ser = yoy(base, state.corridor);
      else ser = base;
    }
    VIEW = {ser, kind, metric: state.metric};

    document.getElementById('boardTitle').textContent = T(md.title);
    const gA = state.corridor === 'ALL' && (state.metric === 'si' || state.metric === 'level' || state.metric === 'yoy');
    document.getElementById('boardGrade').innerHTML = gA
      ? `<span class="g gA">A · ${T('gradeA')}</span>` : `<span class="g gB">B · ${T('gradeB')}</span>`;

    let banner = '';
    if (modeBanner) banner = T('measuredBanner');
    else if (state.corridor !== 'ALL') {
      const runs = DATA.meta.doe_regimes.filter(r => r.quarters.length)
        .map(r => `${r.quarters[0]}–${r.quarters[r.quarters.length - 1]}`).join(', ');
      banner = T('corridorBanner')(runs);
    }
    document.getElementById('boardBanner').innerHTML = banner ? `<p class="banner">${banner}</p>` : '';

    const vals = Object.values(ser);
    const bin = binner(state.metric, vals);
    const years = [];
    for (let y = yearOf(Q[Q.length - 1]); y >= yearOf(Q[0]); y--) years.push(y);

    let h = `<div class="hd"></div>`;
    for (let n = 1; n <= 4; n++) h += `<div class="hd">Q${n}<span class="fest">${festLabel(n)}</span></div>`;
    h += `<div class="hd">${T('yearCol')}</div>`;

    years.forEach(y => {
      h += `<div class="rh">${y}</div>`;
      let rowSum = 0, rowN = 0;
      for (let n = 1; n <= 4; n++) {
        const q = `${y}Q${n}`;
        const v = ser[q];
        if (v == null) {
          // A quarter the cross-check withheld is voided rather than left blank:
          // the reading existed, it was rejected. Struck, so you can see it was.
          const withheld = (DATA.meta.doe_disputed_quarters || []).includes(q)
            && state.corridor !== 'ALL';
          // An empty cell can still be the selected one -- the newest quarters
          // carry no centred index yet, and the detail panel reads them happily,
          // so the grid has to show where the reader is standing.
          h += `<div class="cell nd${withheld ? ' void' : ''}`
            + `${state.sel === q ? ' sel' : ''}" data-q="${q}"`
            + ` title="${withheld ? T('roWithheld') : (DQ[q] || state.corridor === 'ALL' ? '' : T('noRun'))}">`
            + `${withheld ? '' : T('none')}</div>`;
          continue;
        }
        rowSum += v; rowN++;
        const c = [cls(state.metric, bin(v)), 'cell'];
        if (!gA) c.push('mod');
        if (PROV.has(q)) c.push('prov');
        if (state.sel === q) c.push('sel');
        const mark = kind[q] === 't' ? '○' : '';
        h += `<div class="${c.join(' ')}" data-q="${q}" tabindex="0" role="button">${md.fmt(v)}${mark}</div>`;
      }
      const agg = state.metric === 'level' ? (rowN === 4 ? nf(rowSum / 1000, 1) : '')
        : (rowN ? md.fmt(rowSum / rowN) : '');
      h += `<div class="rowtot">${agg}</div>`;
    });

    // summary row: the median of each quarter across every year on the grid
    const med = arr => { if (!arr.length) return null;
      const s2 = arr.slice().sort((a, b) => a - b), m = s2.length >> 1;
      return s2.length % 2 ? s2[m] : (s2[m - 1] + s2[m]) / 2; };
    h += `<div class="rh med">${T('medianRow')}</div>`;
    for (let n = 1; n <= 4; n++) {
      const col = years.map(y => ser[`${y}Q${n}`]).filter(v => v != null);
      const m = med(col);
      h += m == null ? `<div class="cell nd med">${T('none')}</div>`
        : `<div class="cell med ${cls(state.metric, bin(m))}">${md.fmt(m)}</div>`;
    }
    h += `<div class="rowtot med">${years.length ? 'n=' + years.length : ''}</div>`;
    document.getElementById('board').innerHTML = h;

    const pal = md.diverging ? ['--d1', '--d2', '--d3', '--d4', '--d5'] : ['--s1', '--s2', '--s3', '--s4', '--s5'];
    const edges = state.metric === 'si' ? DIV_SI.map(v => v.toFixed(2))
      : state.metric === 'yoy' ? DIV_YOY.map(v => (v * 100).toFixed(0) + '%')
      : (() => { const s = vals.slice().sort((a, b) => a - b);
          if (!s.length) return ['', '', '', ''];
          const q = k => s[Math.min(s.length - 1, Math.round(k * (s.length - 1)))];
          return [0.2, 0.4, 0.6, 0.8].map(k => md.fmt(q(k))); })();
    document.getElementById('legend').innerHTML = pal.map(
      (p, i) => `<div class="lg"><i style="background:var(${p})"></i><em>${edges[i] || ''}</em></div>`).join('');
    document.getElementById('legLo').textContent = md.diverging ? T('legLo') : T('legLoSeq');
    document.getElementById('legMid').textContent = md.diverging ? T('legMid') : T('legMidSeq');
    document.getElementById('legHi').textContent = md.diverging ? T('legHi') : T('legHiSeq');

    const notes = [state.metric === 'si' ? T('boardHintSi')
      : state.metric === 'worker' ? T('workerHint') : T('boardHintOther')];
    if (state.metric === 'worker' && NATS.every(n => state.prop[n] === state.prop[NATS[0]]))
      notes.push(T('identityNote'));
    if (Object.keys(ser).some(q => PROV.has(q))) notes.push(T('provNote'));
    document.getElementById('boardHint').innerHTML = notes.join('<br>');
  }

  /* ── render: detail ──────────────────────────────────────────────────── */
  function renderDetail() {
    const host = document.getElementById('detail');
    const q = state.sel;
    if (!q || PT[q] == null) {
      host.innerHTML = `<div class="ptitle"><h2>${T('selected')}</h2></div><div class="empty">${T('emptyDetail')}</div>`;
      return;
    }
    const d = DQ[q];
    const cObj = DATA.corridors.find(c => c.code === state.corridor);
    const si = seasonalIndex(seriesFor('si', 'ALL'), 'ALL').v[q];
    const f = cObj ? flowOf(q, cObj.code) : null;
    const a = alphaOf(q);
    const pw = cObj ? perWorker(q, cObj.code) : null;
    const prev = Q[qi[q] - 4];
    const yy = prev && PT[prev] ? PT[q] / PT[prev] - 1 : null;

    const rows = [
      [T('dPaid'), bn(PT[q]), mb(PT[q]) + ' ' + T('unitMB'), 'A'],
      [T('dSi'), si == null ? T('none') : si.toFixed(3), 'centred 4q', 'A'],
      [T('dYoy'), sgn(yy), prev || '', 'A'],
      [T('dWorkers'), d ? nf(NATS.reduce((s, n) => s + d.stock[n], 0), 0) : T('none'),
        d ? `${T('regime')} ${d.regime} · ${d.unit}` : T('noRun'), 'A'],
    ];
    if (cObj) rows.push(
      [T('dShare'), a ? pct(a[cObj.code]) : T('none'), cname(cObj), 'B'],
      [T('dFlow'), bn(f), f == null ? '' : mb(f) + ' ' + T('unitMB'), 'B'],
      [T('dWorker'), pw == null ? T('none') : nf(pw, 0) + ' ฿', d ? nf(d.stock[cObj.code], 0) + ' ' + T('workers') : '', 'B']);

    host.innerHTML = `<div class="ptitle"><h2>${T('selected')}</h2></div>
      <div class="dn">${q}</div>
      <div class="dsub">${cObj ? cname(cObj) : T('all')}${PROV.has(q) ? ' · provisional' : ''}</div>
      <div class="dstat">${rows.map(([k, v, s, g]) =>
        `<div><span class="k">${k} <span class="g g${g}">${g}</span></span><span class="v">${v}</span><span class="s">${s}</span></div>`).join('')}</div>`;
  }

  /* ── render: ranking, flows, receiving-country context ───────────────── */
  /* Quarters from the most recent usable run of the work-permit table. Summing
     across a boundary would add up two different definitions. */
  function latestRun() {
    const runs = DATA.meta.doe_regimes.filter(r => r.quarters.length);
    return runs.length ? runs[runs.length - 1] : null;
  }
  function lastQuartersWithModel(n) {
    const r = latestRun();
    return r ? r.quarters.slice(-n) : [];
  }
  function renderRank() {
    document.getElementById('rankTitle').textContent = T('rankTitle');
    // Everything in this panel is modelled, so "measured only" has to empty it.
    // Leaving the figures up while the banner says they are hidden would make the
    // page's own honesty control a lie.
    if (state.measuredOnly) {
      document.getElementById('rank').innerHTML =
        `<div class="empty">${T('hiddenModelled')}</div>`;
      document.getElementById('rankHint').textContent = '';
      return;
    }
    const qs = lastQuartersWithModel(4);
    const tot = {};
    DATA.corridors.forEach(c => tot[c.code] = qs.reduce((s, q) => s + (flowOf(q, c.code) || 0), 0));
    const max = Math.max(...Object.values(tot), 1);
    const order = DATA.corridors.slice().sort((a, b) => tot[b.code] - tot[a.code]);
    document.getElementById('rank').innerHTML = order.map((c, i) => `
      <div class="row ${state.corridor === c.code ? 'sel' : ''}" data-c="${c.code}"
        tabindex="0" role="button" aria-pressed="${state.corridor === c.code}">
        <div class="i">${i + 1}</div>
        <div class="n">${cname(c)}</div>
        <div class="bar"><i style="width:${Math.max(2, 92 * tot[c.code] / max)}px"></i>
          <span class="v">${bn(tot[c.code])}</span></div></div>`).join('');
    const run = latestRun();
    document.getElementById('rankTitle').textContent = T('rankTitle');
    document.getElementById('rankHint').textContent = T('rankHint') +
      (qs.length ? ` (${qs[0]}–${qs[qs.length - 1]}, ${T('regime')} ${run.id}, ${qs.length}q)` : '');
  }
  function renderFlows() {
    const qs = lastQuartersWithModel(1);
    const q = qs[0];
    const host = document.getElementById('flows');
    document.getElementById('flowTitle').textContent = T('flowTitle');
    if (state.measuredOnly) {                       // widths and per-worker are modelled
      host.innerHTML = `<div class="empty">${T('hiddenModelled')}</div>`;
      document.getElementById('flowHint').textContent = '';
      return;
    }
    if (!q) { host.innerHTML = `<div class="empty">${T('noRun')}</div>`; return; }
    const vals = {};
    DATA.corridors.forEach(c => vals[c.code] = flowOf(q, c.code) || 0);
    const max = Math.max(...Object.values(vals), 1);
    host.innerHTML = DATA.corridors.slice().sort((a, b) => vals[b.code] - vals[a.code]).map(c => {
      const pw = perWorker(q, c.code);
      return `<div class="flow"><div class="fn">${cname(c)}<span>${nf(DQ[q].stock[c.code], 0)} ${T('workers')}</span></div>
        <div class="fb"><i style="width:${(100 * vals[c.code] / max).toFixed(1)}%"></i></div>
        <div class="fv">${bn(vals[c.code])}<span>${pw == null ? T('none') : nf(pw, 0) + ' ฿/mo'}</span></div></div>`;
    }).join('');
    document.getElementById('flowTitle').textContent = T('flowTitle') + '  ·  ' + q;
    const flat = NATS.every(n => state.prop[n] === state.prop[NATS[0]]);
    document.getElementById('flowHint').textContent =
      T('flowHint') + (flat ? '  ' + T('identityNote') : '');
  }
  function renderContext() {
    const fxYears = Object.keys(DATA.wb.fx).map(Number).sort((a, b) => b - a);
    const rows = DATA.corridors.map(c => {
      const inf = DATA.wb.inflow[c.iso3] || {};
      const ys = Object.keys(inf).map(Number).sort((a, b) => b - a);
      const y = ys[0];
      const gdp = (DATA.wb.gdp[c.iso3] || {})[String(y)];
      return {c, y, v: y ? inf[String(y)] : null, share: y && gdp ? inf[String(y)] / gdp : null};
    });
    const max = Math.max(...rows.map(r => r.v || 0), 1);
    document.getElementById('ctx').innerHTML = rows.sort((a, b) => (b.v || 0) - (a.v || 0)).map(r => `
      <div class="row ${state.corridor === r.c.code ? 'sel' : ''}" data-c="${r.c.code}"
        tabindex="0" role="button" aria-pressed="${state.corridor === r.c.code}">
        <div class="i">${r.y || ''}</div>
        <div class="n">${cname(r.c)}${r.y && r.y < 2024 ? ` <span style="color:var(--ember)">· ends ${r.y}</span>` : ''}</div>
        <div class="bar"><i style="width:${Math.max(2, 76 * (r.v || 0) / max)}px;background:var(--petrol-2)"></i>
          <span class="v">${r.v == null ? T('none') : '$' + nf(r.v / 1e9, 1) + 'bn'}</span></div></div>`).join('');
    document.getElementById('ctxTitle').textContent = T('ctxTitle');
    document.getElementById('ctxHint').textContent = T('ctxHint') +
      (fxYears.length ? ` · FX ${fxYears[0]}: ${DATA.wb.fx[fxYears[0]].toFixed(1)} ฿/$` : '');
  }

  /* ── render: the long series ─────────────────────────────────────────── */
  function renderChart() {
    const host = document.getElementById('chartHost');
    // The viewBox is drawn to the host's real pixel width, so nothing is
    // scaled non-uniformly and the axis labels keep their proportions at
    // every screen size.
    const W = Math.max(300, Math.round(host.getBoundingClientRect().width) || 760);
    const H = 184, ml = 40, mr = 34, mt = 14, mb2 = 20;
    const iw = W - ml - mr, ih = H - mt - mb2;
    const vals = Q.map(q => PT[q]);
    // Ticks land on round baht figures the series actually reaches, not on
    // thirds of the maximum.
    const step = (v => { const p = 10 ** Math.floor(Math.log10(v));
      return ([1, 2, 2.5, 5, 10].find(k => k * p >= v) || 10) * p; })(Math.max(...vals) / 3000);
    const max = step * 3 * 1000;
    const x = i => ml + iw * i / (Q.length - 1);
    const y = v => mt + ih * (1 - v / max);
    const line = Q.map((q, i) => `${x(i).toFixed(1)},${y(PT[q]).toFixed(1)}`).join(' ');
    /* The measured national series is always drawn; picking a corridor adds a
       dashed modelled line over it, which the hint explains and the name did
       not mention. */
    const cSel = DATA.corridors.find(c => c.code === state.corridor);
    const chartName = T('chartTitle')
      + (cSel ? ' · with ' + cname(cSel) + ' modelled' : '');
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="${chartName}">`;
    for (let g = 0; g <= 3; g++) {
      const v = max * g / 3;
      s += `<line class="${g ? 'gl' : 'ax'}" x1="${ml}" y1="${y(v).toFixed(1)}" x2="${W - mr}" y2="${y(v).toFixed(1)}"/>`;
      s += `<text x="${ml - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${(v / 1000).toFixed(0)}</text>`;
    }
    s += `<polygon class="ar" points="${ml},${mt + ih} ${line} ${W - mr},${mt + ih}"/>`;
    s += `<polyline class="ln" points="${line}"/>`;
    if (state.corridor !== 'ALL' && !state.measuredOnly) {
      const seg = [];
      let run = [];
      Q.forEach((q, i) => {
        const v = flowOf(q, state.corridor);
        if (v == null) { if (run.length > 1) seg.push(run); run = []; return; }
        run.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      });
      if (run.length > 1) seg.push(run);
      seg.forEach(r => s += `<polyline class="ln2" points="${r.join(' ')}"/>`);
    }
    Q.forEach((q, i) => {
      if (qnOf(q) !== 1 || yearOf(q) % 4) return;
      s += `<text x="${x(i).toFixed(1)}" y="${H - 5}" text-anchor="middle">${yearOf(q)}</text>`;
    });
    const li = Q.length - 1, lv = PT[Q[li]];
    // Crosshair + hit strips: the same tooltip the grid uses, on the series.
    s += `<line class="cross" y1="${mt}" y2="${mt + ih}" x1="0" x2="0"/>`;
    s += `<circle class="hot" r="4" cx="0" cy="0"/>`;
    const half = iw / (Q.length - 1) / 2;
    Q.forEach((q, i) => { s += `<rect class="hit" data-q="${q}" data-cx="${x(i).toFixed(1)}"`
      + ` data-cy="${y(PT[q]).toFixed(1)}" x="${(x(i) - half).toFixed(1)}" y="${mt}"`
      + ` width="${(half * 2).toFixed(1)}" height="${ih}"/>`; });
    s += `<circle class="dot" cx="${x(li).toFixed(1)}" cy="${y(lv).toFixed(1)}" r="3.8"/>`;
    s += `<text class="endlab" x="${(x(li) + 7).toFixed(1)}" y="${(y(lv) + 3.5).toFixed(1)}"`
      + ` text-anchor="start">${(lv / 1000).toFixed(1)}</text>`;
    s += `<text x="0" y="${mt - 5}" text-anchor="start">${T('unitBn')}</text></svg>`;
    host.innerHTML = s;
    document.getElementById('chartTitle').textContent = T('chartTitle');
    document.getElementById('chartHint').textContent = T('chartHint')(Q.length);
    const cObj2 = DATA.corridors.find(c => c.code === state.corridor);
    const second = state.corridor !== 'ALL' && !state.measuredOnly && cObj2;
    document.getElementById('chartLeg').innerHTML = second
      ? `<span><i></i>${T('dPaid')} · ${T('gradeA')}</span>`
        + `<span><i class="est"></i>${cname(cObj2)} · ${T('gradeB')}</span>`
      : '';
  }
  let chartRAF = 0;
  addEventListener('resize', () => {
    clearTimeout(chartRAF);
    chartRAF = setTimeout(renderChart, 160);
  });

  /* Opacity is the evidence grade. A sheet holding modelled figures stays
     translucent so the squared ground reads through it; a measured sheet is
     opaque. This is the A/B distinction drawn, not decoration. */
  function markTrace() {
    const modelled = new Set();
    if (!state.measuredOnly) {
      ['rank', 'flows'].forEach(id => {
        const el = document.getElementById(id);
        const p = el && el.closest('.panel');
        if (p) modelled.add(p);
      });
      if (state.corridor !== 'ALL') {
        const b = document.getElementById('board');
        const p = b && b.closest('.panel');
        if (p) modelled.add(p);
      }
    }
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('trace', modelled.has(p)));
  }

  /* ── the plan standing up ───────────────────────────────────────────────
     One scalar, from the map panel's travel through the viewport, drives both
     the squash of the plan and the height of the columns. Scrubbed both ways,
     throttled to a frame, and skipped entirely when the reader has asked for
     less motion or has locked the drawing flat. */
  /* Headroom for the columns to rise into. It was 250, and measuring the
     drawing at every scroll position showed nothing ever reached it: the plan
     holds y 6..906 throughout and the massing's top only gets to y=42 before
     descending to y=200 as the columns finish. So 21.5% of the box was empty
     at all times, which at 470px wide made the map column 1088px tall beside a
     392px ranking -- the reason the panel read as mostly air. What is left is
     a margin, not a reservation. */
  const MASS_HEAD = 60;
  const MASS_MAX = 230;       // the tallest column, in the same units
  let MASS_EL = null, massP = 0, massFrame = false;
  let massMode = 'auto';      // 'auto' follows the scroll, 'flat' stays a plan

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function massTarget() {
    if (massMode === 'flat') return 0;
    const panel = document.getElementById('mapPanel');
    if (!panel) return 0;
    const r = panel.getBoundingClientRect();
    // 0 while the sheet is still below the fold, 1 once it has settled in view
    const enter = innerHeight * 0.92, settle = innerHeight * 0.34;
    const p = (enter - r.top) / (enter - settle);
    return Math.max(0, Math.min(1, p));
  }

  function applyMass() {
    if (!MASS_EL || !MASS_EL.plan) return;
    const p = reduceMotion.matches ? (massMode === 'flat' ? 0 : 1) : massP;
    const H = +buildPaths().h;
    const k = 1 - 0.42 * p;                    // the plan lies back
    MASS_EL.plan.setAttribute('transform',
      `translate(0 ${(H / 2).toFixed(1)}) scale(1 ${k.toFixed(4)}) translate(0 ${(-H / 2).toFixed(1)})`);
    MASS_EL.cols.forEach(g => {
      const cx = +g.dataset.c1, cy = +g.dataset.c2, h = +g.dataset.h * p;
      const base = (cy - H / 2) * k + H / 2;   // the anchor, squashed with the plan
      const lineEl = g.firstChild, capEl = g.lastChild;
      lineEl.setAttribute('x1', cx); lineEl.setAttribute('y1', base.toFixed(1));
      lineEl.setAttribute('x2', cx); lineEl.setAttribute('y2', (base - h).toFixed(1));
      capEl.setAttribute('cx', cx); capEl.setAttribute('cy', (base - h).toFixed(1));
      g.style.opacity = p < 0.04 ? 0 : 1;
    });
  }

  function onMassScroll() {
    if (massFrame) return;
    massFrame = true;
    requestAnimationFrame(() => {
      massFrame = false;
      const t = massTarget();
      if (Math.abs(t - massP) < 0.002) return;
      massP = t;
      applyMass();
      setProgress(t);
    });
  }
  /* Smooth scroll and the scrub that drives the drawing. Both are progressive:
     if GSAP or Lenis fail to arrive the native scroll listener below still runs
     the massing, so the page degrades to what it did before they existed. */
  let lenis = null, scrollReady = false;

  /* Lenis arrives as a module, so it may land before or after the load handler.
     Both paths call this and it only ever attaches once. */
  function attachLenis() {
    if (lenis || typeof Lenis === 'undefined' || reduceMotion.matches) return;
    lenis = new Lenis({duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9});
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function initScroll() {
    if (scrollReady) return;
    scrollReady = true;
    const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    attachLenis();
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      // One scrub over the panel's travel: the same scalar the hand-rolled
      // driver produced, but frame-synced to the smoothed scroll instead of
      // sampled from it.
      ScrollTrigger.create({
        trigger: '#mapPanel', start: 'top 92%', end: 'top 34%', scrub: true,
        onUpdate: st => { massP = st.progress; applyMass(); setProgress(st.progress); },
      });
      /* How far down the page the reader is. One scrub over the document, and
         a transform rather than a width so it never lays anything out. */
      const fill = document.getElementById('readfill');
      if (fill) ScrollTrigger.create({
        trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: st => { fill.style.transform = `scaleX(${st.progress})`; },
      });
      /* The map's head only earns its rule once it has actually stuck. Measured
         against the panel, never against the head itself: the head is the
         sticky element, so it stops moving with the page exactly when this
         trigger needs to know where it is. */
      const head = document.querySelector('.maphead');
      if (head) ScrollTrigger.create({
        trigger: '#mapPanel', start: 'top top', end: 'bottom top',
        onToggle: st => head.classList.toggle('stuck', st.isActive),
      });
      /* Every trigger above is a scroll position worked out from the current
         layout, and the display faces arrive after first paint -- when they
         land, the text reflows, the panels move, and every one of those
         positions is off by however much shifted above them. Measure again
         once the fonts are in. */
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    } else {
      addEventListener('scroll', onMassScroll, {passive: true});
      addEventListener('resize', onMassScroll, {passive: true});

    }
    massP = massTarget(); applyMass(); setProgress(massP);
    settlePanels();
  }

  /* Each plate sits 9px low until it arrives, then settles. No fade: a panel
     you cannot read yet is a panel that is not there, and everything on this
     page is meant to be readable in the first frame. Observed rather than
     scrubbed, so it costs nothing per frame, and it runs whether or not the
     animation libraries arrived. Anything already on screen settles at once. */
  function settlePanels() {
    // The hero is above the fold by definition; there is nothing to arrive.
    const panels = [...document.querySelectorAll('.panel')];
    const settle = p => p.classList.add('settled');
    if (!('IntersectionObserver' in window)
        || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panels.forEach(settle);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        settle(e.target);
        io.unobserve(e.target);
      });
    }, {rootMargin: '0px 0px -8% 0px'});
    panels.forEach(p => io.observe(p));
    /* The offset is only ever safe because something is guaranteed to remove
       it. An observer that never fires -- a tab rendered at zero size, a
       browser that skips the work while hidden -- would otherwise leave every
       plate sitting 9px low for good. */
    setTimeout(() => panels.forEach(p => {
      if (!p.classList.contains('settled')) { settle(p); io.unobserve(p); }
    }), 2500);
  }
  /* The single-file build ran during parsing, so waiting for `load` was safe.
     This module runs after hydration, which can be after `load` has already
     fired -- in which case the listener would never call. */
  if (document.readyState === 'complete') initScroll();
  else addEventListener('load', initScroll);
  reduceMotion.addEventListener('change', applyMass);

  /* The 3D layer lives in components/Massing.jsx now -- an R3F component that
     subscribes to the scroll scalar published below. This module keeps the SVG
     axonometric, which is still the base drawing and the fallback whenever the
     canvas is absent: no WebGL, reduced motion, or the drawing left flat. */

  /* ── render: province map ─────────────────────────────────────────────
     Where the money leaves from. Work-permit holders by province, from the DOE
     province tables. These cover four of the permit categories rather than all
     of them, so the province sum runs a few per cent under the national count --
     the shortfall is printed rather than scaled away.                        */
  const PV = DATA.prov || {};
  const PV_BY_CODE = {};
  (PV.list || []).forEach(p => PV_BY_CODE[p.code] = p);
  let MAP_PATHS = null;
  let mapMetric = 'workers';
  const PV_KEYS = Object.keys(PV.months || {}).sort();
  let mapMonth = PV_KEYS.length ? PV_KEYS[PV_KEYS.length - 1] : null;

  /* First accepted month in the same run as the one on screen. A change measured
     across a run boundary would be a change in what the table counts, so the
     change metric simply is not offered there. */
  function runBase(month) {
    const reg = PV.months[month] && PV.months[month].regime;
    if (!reg) return null;
    const same = PV_KEYS.filter(m => PV.months[m].regime === reg);
    return same.length > 1 && same[0] !== month ? same[0] : null;
  }

  function buildPaths() {
    if (MAP_PATHS) return MAP_PATHS;
    const geo = PV.geo || [];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    const scan = g => {
      if (typeof g[0] === 'number') {
        if (g[0] < minX) minX = g[0];
        if (g[0] > maxX) maxX = g[0];
        if (g[1] < minY) minY = g[1];
        if (g[1] > maxY) maxY = g[1];
      } else g.forEach(scan);
    };
    geo.forEach(f => scan(f.g));
    const kx = Math.cos((minY + maxY) / 2 * Math.PI / 180);
    const H = 900, pad = 6;
    const S = H / (maxY - minY);
    const px = c => ((c[0] - minX) * kx * S + pad).toFixed(1);
    const py = c => ((maxY - c[1]) * S + pad).toFixed(1);
    const ring = r => 'M' + r.map(c => px(c) + ' ' + py(c)).join('L') + 'Z';
    const poly = pg => pg.map(ring).join('');
    // Where a column stands: the vertex mean of the province's largest ring,
    // which keeps the mark on the mainland instead of out on an island.
    const anchor = f => {
      const rings = f.t === 'Polygon' ? f.g : f.g.map(pg => pg[0]);
      const big = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0]);
      let sx = 0, sy = 0;
      big.forEach(c => { sx += +px(c); sy += +py(c); });
      return [sx / big.length, sy / big.length];
    };
    MAP_PATHS = {
      proj: [c => +px(c), c => +py(c)],
      w: ((maxX - minX) * kx * S + pad * 2).toFixed(0),
      h: (H + pad * 2).toFixed(0),
      d: geo.map(f => ({code: f.c, d: f.t === 'Polygon' ? poly(f.g) : f.g.map(poly).join(''),
                        at: anchor(f)})),
    };
    // The canvas builds its prisms from this same projection, so the two
    // layers register exactly on top of one another.
    if (setGeom) setGeom({w: +MAP_PATHS.w, h: +MAP_PATHS.h, proj: MAP_PATHS.proj,
                          head: MASS_HEAD, max: MASS_MAX, geo: PV.geo || []});
    return MAP_PATHS;
  }

  function provLevel(code, snap) {
    const d = snap && snap.by_code[code];
    if (!d) return null;
    return state.corridor === 'ALL'
      ? NATS.reduce((s, n) => s + (d[n] || 0), 0)
      : (d[state.corridor] || 0);
  }
  function provValue(code, snap, baseSnap) {
    const d = snap.by_code[code];
    if (!d) return null;
    if (mapMetric === 'share') {
      if (state.corridor === 'ALL') return null;
      const tot = NATS.reduce((s, n) => s + (d[n] || 0), 0);
      return tot ? d[state.corridor] / tot : null;
    }
    if (mapMetric === 'change') {
      const now = provLevel(code, snap), was = provLevel(code, baseSnap);
      return was ? now / was - 1 : null;
    }
    return provLevel(code, snap);
  }

  function renderMap() {
    // The canvas is a sibling of the plan, not a child: this module replaces
    // the plan's markup wholesale and would otherwise wipe React's canvas out
    // from under it.
    const host = document.getElementById('mapPlan') || document.getElementById('mapHost');
    const panel = document.getElementById('mapPanel');
    if (!PV_KEYS.length) { panel.style.display = 'none'; return; }
    panel.style.display = '';
    if (!PV.months[mapMonth]) mapMonth = PV_KEYS[PV_KEYS.length - 1];
    const month = mapMonth;
    const snap = PV.months[month];
    const baseMonth = runBase(month);
    const baseSnap = baseMonth ? PV.months[baseMonth] : null;
    const cObj = DATA.corridors.find(c => c.code === state.corridor);
    if (mapMetric === 'share' && state.corridor === 'ALL') mapMetric = 'workers';
    if (mapMetric === 'change' && !baseSnap) mapMetric = 'workers';

    document.getElementById('mapChips').innerHTML =
      chip(T('mWorkersProv'), mapMetric === 'workers', 'data-map="workers"') +
      chip(T('mShareProv'), mapMetric === 'share', 'data-map="share"',
           state.corridor === 'ALL') +
      chip(T('mChangeProv'), mapMetric === 'change', 'data-map="change"', !baseSnap) +
      `<span style="width:9px"></span>` +
      chip(T('mMassing'), massMode === 'auto', 'data-mass="1"');
    // A selected province is a shareable piece of state, so it has to be
    // readable. Without this a link carrying p=34 arrives as an outline on a
    // small choropleth and nothing else.
    const selProv = state.province && PV_BY_CODE[state.province]
      ? PV_BY_CODE[state.province].en : null;
    document.getElementById('mapTitle').textContent =
      T('mapTitle') + '  ·  ' + month + (cObj ? '  ·  ' + cname(cObj) : '')
      + (selProv ? '  ·  ' + selProv : '');

    const i = PV_KEYS.indexOf(month);
    document.getElementById('monthBar').innerHTML =
      `<label class="lab" for="dMonth">${T('monthLabel')}</label>`
      + `<input type="range" id="dMonth" min="0" max="${PV_KEYS.length - 1}" step="1" value="${i}"`
      + ` aria-valuetext="${month}" data-month>`
      + `<span class="mv">${month}</span>`
      + `<span class="run">${T('regime')} ${snap.regime || '—'} · `
      + `${T('monthsWord')(PV_KEYS.filter(m => PV.months[m].regime === snap.regime).length)}`
      + `${mapMetric === 'change' && baseMonth ? ' · vs ' + baseMonth : ''}</span>`;

    const vals = [];
    const byCode = {};
    Object.keys(PV_BY_CODE).forEach(code => {
      const v = provValue(code, snap, baseSnap);
      byCode[code] = v;
      if (v != null) vals.push(v);
    });
    const diverging = mapMetric === 'change';
    // Symmetric breaks fitted to how far provinces actually moved, so that zero
    // stays the midpoint and a handful of outliers do not flatten everything else.
    const spread = (() => {
      const a = vals.map(Math.abs).sort((x, y) => x - y);
      if (!a.length) return 0.1;
      return Math.max(0.02, a[Math.min(a.length - 1, Math.round(0.9 * (a.length - 1)))]);
    })();
    const changeEdges = [-spread, -spread / 3, spread / 3, spread];
    const bin = diverging
      ? (v => 1 + changeEdges.filter(e => v > e).length)
      : binner('level', vals);
    const pal = diverging ? 'd' : 's';
    const P = buildPaths();
    // The drawing is a plan until you scroll it, then it lies back into
    // axonometric and every province raises a column. Height is the same
    // measured quantity the fill already shows, so standing the sheet up adds a
    // reading rather than an effect: the tall stacks are where the money leaves.
    // The projection is done in SVG coordinates -- the plan group is squashed
    // vertically and the columns are drawn upright at the squashed anchors --
    // so verticals stay vertical, the way an axonometric is meant to work.
    const H = +P.h, W = +P.w;
    const top = MASS_HEAD;
    /* The drawing's name was the bare heading, so a reader was told "Where the
       money leaves from" and nothing about which month, corridor or province
       it was looking at -- all three of which the sighted title carries and the
       fragment can set. Same text, same order. */
    const selName = state.province && PV_BY_CODE[state.province]
      ? PV_BY_CODE[state.province].en : null;
    const mapName = [T('mapTitle'), month, cObj ? cname(cObj) : null, selName]
      .filter(Boolean).join(' · ');
    let svg = `<svg class="map" viewBox="0 ${-top} ${W} ${H + top}" role="img"`
      + ` aria-label="${mapName}">`
      + `<g class="plan" transform="translate(0 ${(H / 2).toFixed(1)}) scale(1 1)`
      + ` translate(0 ${(-H / 2).toFixed(1)})">`;
    P.d.forEach(f => {
      const v = byCode[f.code];
      const cls2 = v == null ? 'nd' : '';
      const fill = v == null ? '' : ` fill="var(--${pal}${bin(v)})"`;
      svg += `<path class="${cls2}${state.province === f.code ? ' sel' : ''}"${fill}`
        + ` d="${f.d}" data-p="${f.code}"></path>`;
    });
    svg += '</g><g class="mass" aria-hidden="true">';
    // tallest column is a fixed share of the drawing, so the massing reads the
    // same whichever metric is on screen
    const top1 = vals.length ? Math.max(...vals.map(Math.abs)) : 1;
    // Hand the 3D component the same numbers this drawing is using, so the
    // canvas over it can never show a different reading.
    if (setMassing) {
      const model = {};
      Object.keys(PV_BY_CODE).forEach(code => {
        const v = byCode[code];
        model[code] = v == null ? null
          : {value: v, tone: `--${pal}${bin(v)}`, h: top1 ? (Math.abs(v) / top1) : 0};
      });
      setMassing({byCode: model, metric: mapMetric, month: mapMonth,
                  selected: state.province});
    }
    P.d.forEach(f => {
      const v = byCode[f.code];
      if (v == null || !top1) return;
      const hgt = (Math.abs(v) / top1) * MASS_MAX;
      if (hgt < 0.8) return;
      const [cx, cy] = f.at;
      svg += `<g data-c1="${cx.toFixed(1)}" data-c2="${cy.toFixed(1)}"`
        + ` data-h="${hgt.toFixed(1)}" data-p="${f.code}">`
        + `<line x1="0" y1="0" x2="0" y2="0"></line>`
        + `<circle cx="0" cy="0" r="1.7"></circle></g>`;
    });
    svg += '</g></svg>';
    host.innerHTML = svg;
    MASS_EL = {plan: host.querySelector('.plan'),
               cols: [...host.querySelectorAll('.mass > g')]};
    applyMass();

    const fmtP = v => v == null ? T('none')
      : mapMetric === 'share' ? pct(v, 0)
      : mapMetric === 'change' ? sgn(v) : nf(v, 0);
    const s2 = vals.slice().sort((a, b) => a - b);
    const q = k => s2[Math.min(s2.length - 1, Math.round(k * (s2.length - 1)))];
    const edges = diverging
      ? changeEdges.map(v => sgn(v)).concat([''])
      : (s2.length ? [0.2, 0.4, 0.6, 0.8, 1].map(k => fmtP(q(k))) : ['', '', '', '', '']);
    document.getElementById('mapLegend').innerHTML = [1, 2, 3, 4, 5].map(
      (n, i2) => `<div class="lg"><i style="background:var(--${pal}${n})"></i>`
        + `<em>${edges[i2]}</em></div>`).join('');
    document.getElementById('mapLegLo').textContent = diverging ? T('legFell') : T('legLoSeq');
    document.getElementById('mapLegHi').textContent = diverging ? T('legRose') : T('legHiSeq');

    const order = Object.keys(byCode).filter(c => byCode[c] != null)
      .sort((a, b) => (diverging ? Math.abs(byCode[b]) - Math.abs(byCode[a])
                                 : byCode[b] - byCode[a]));
    const ranked = order.slice(0, 12);
    const max = ranked.length ? Math.abs(byCode[ranked[0]]) || 1 : 1;
    const row = (code, place, pinned) => `
      <div class="row ${state.province === code ? 'sel' : ''}${pinned ? ' pinned' : ''}" data-p="${code}"
        tabindex="0" role="button" aria-pressed="${state.province === code}">
        <div class="i">${place}</div>
        <div class="n">${PV_BY_CODE[code] ? PV_BY_CODE[code].en : code}</div>
        <div class="bar"><i style="width:${Math.max(2, 66 * Math.abs(byCode[code]) / max)}px"></i>
          <span class="v">${fmtP(byCode[code])}</span></div></div>`;
    // Ubon Ratchathani sits 43rd of 77: selecting it used to highlight nothing,
    // because the list stops at twelve. A selection below the cut is pinned
    // underneath with its real place, so the name and the figure are always
    // readable even when the province is a small one.
    let rows = ranked.map((code, i) => row(code, i + 1, false)).join('');
    const place = state.province ? order.indexOf(state.province) + 1 : 0;
    if (place > ranked.length) rows += row(state.province, place, true);
    document.getElementById('provRank').innerHTML = rows;

    const cov = snap.coverage || {};
    document.getElementById('mapHint').innerHTML =
      (massMode === 'auto' ? T('massNote') + ' ' : '') + T('mapHint')(
      snap.provinces, month,
      Object.entries(cov).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(', '),
      (PV.rejected || []).length, PV_KEYS.length);
  }

  /* ── render: the full table ──────────────────────────────────────────── */
  function renderTable() {
    const cols = T('cols');
    const si = seasonalIndex(seriesFor('si', 'ALL'), 'ALL').v;
    const cObj = DATA.corridors.find(c => c.code === state.corridor);
    const hide = state.measuredOnly;
    const rows = Q.slice().reverse().map(q => {
      const d = DQ[q], a = alphaOf(q);
      const c = cObj ? cObj.code : null;
      return {
        q,
        paid: PT[q],
        si: si[q] == null ? null : si[q],
        workers: d ? (c ? d.stock[c] : NATS.reduce((s, n) => s + d.stock[n], 0)) : null,
        share: hide ? null : (a && c ? a[c] : (a ? 1 : null)),
        flow: hide || !c ? null : flowOf(q, c),
        pw: hide || !c ? null : perWorker(q, c),
      };
    });
    if (state.sortKey) {
      rows.sort((a, b) => {
        const va = a[state.sortKey], vb = b[state.sortKey];
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va > vb ? 1 : va < vb ? -1 : 0) * state.sortDir;
      });
    }
    const keys = ['q', 'paid', 'si', 'workers', 'share', 'flow', 'pw'];
    document.getElementById('thead').innerHTML = cols.map((c, i) =>
      `<th scope="col" data-k="${keys[i]}"${state.sortKey === keys[i]
          ? ` aria-sort="${state.sortDir > 0 ? 'ascending' : 'descending'}"` : ''}>`
        + `<button type="button" class="sortbtn">${c}</button></th>`).join('');
    document.getElementById('tbody').innerHTML = rows.map(r => `<tr>
      <td>${r.q}${PROV.has(r.q) ? ' ·p' : ''}</td>
      <td>${mb(r.paid)}</td>
      <td>${r.si == null ? T('none') : r.si.toFixed(3)}</td>
      <td>${r.workers == null ? T('none') : nf(r.workers, 0)}</td>
      <td class="${r.share == null ? '' : 'mod'}">${r.share == null ? T('none') : pct(r.share)}</td>
      <td class="${r.flow == null ? '' : 'mod'}">${mb(r.flow)}</td>
      <td class="${r.pw == null ? '' : 'mod'}">${r.pw == null ? T('none') : nf(r.pw, 0)}</td></tr>`).join('');
    document.getElementById('tblTitle').textContent = T('tblTitle') +
      (cObj ? '  ·  ' + cname(cObj) : '');
    document.getElementById('tblHint').textContent = T('tblHint');
  }

  /* ── render: colophon ────────────────────────────────────────────────── */
  function renderAbout() {
    const ab = T('ab');
    [1, 2, 4].forEach(n => {
      document.getElementById('lAb' + n).textContent = ab[n === 4 ? 3 : n - 1];
      const body = T('ab' + n);
      document.getElementById('ab' + n).innerHTML = body.map(
        p => `<p${p.startsWith('<b>What it cannot') ? ' class="warn"' : ''}>${p}</p>`).join('');
    });
    document.getElementById('lAb3').textContent = ab[2];
    document.getElementById('ab3').innerHTML =
      `<p>Every figure on this page comes from one of the rows below. Rows with no grade were
        wanted and not obtained — they are listed so the gap is on the record.</p>`;

    const A = DATA.meta;
    const asof = [
      ['dataset built', A.built],
      ['national flow', `${Q[Q.length - 1]} · ${A.sources[0].as_of.replace(/^[^(]*\(/, '').replace(')', '')}`],
      ['work permits', `${A.doe_range[0]} – ${A.doe_range[1]} · ${A.doe_months} months`],
      ['usable runs', A.doe_regimes.map(r => r.id).join(', ')],
      ['world bank indicators', 'updated ' + DATA.wb.updated],
      ['not obtained', 'corridor prices, origin-country monthly series'],
    ];
    document.getElementById('asof').innerHTML = asof.map(
      ([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    document.getElementById('sthead').innerHTML =
      ['', 'source', 'series', 'frequency', 'as of', 'what to watch for'].map(h => `<th>${h}</th>`).join('');
    document.getElementById('stbody').innerHTML = A.sources.map(s => `<tr>
      <td>${s.grade === '-' ? '<span class="g gC">—</span>' : `<span class="g g${s.grade}">${s.grade}</span>`}</td>
      <td><b>${s.name}</b>${s.url ? `<br><a href="${s.url}" rel="noopener">${s.url.replace(/^https?:\/\//, '').slice(0, 46)}…</a>` : ''}</td>
      <td>${s.table}</td><td>${s.freq}</td><td>${s.as_of}</td><td>${s.note}</td></tr>`).join('');
  }

  /* ── tooltip ─────────────────────────────────────────────────────────── */
  const tip = document.getElementById('tip');
  /* The clamp only held the right and bottom edges: when the tip is wider than
     the viewport the first term goes negative and it hangs off the left instead.
     Both axes are held now, and the same three lines are no longer written
     twice. */
  function placeTip(ev) {
    tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(10, Math.min(innerWidth - r.width - 10, ev.clientX + 14)) + 'px';
    tip.style.top = Math.max(10, Math.min(innerHeight - r.height - 10, ev.clientY + 14)) + 'px';
  }
  /* 1.4.13: what appears on hover has to be dismissable without moving the
     pointer, and nothing dismissed this. */
  function hideTip() { tip.classList.remove('on'); }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && tip.classList.contains('on')) { hideTip(); hideChartMark(); }
  });
  function showTip(q, ev) {
    const d = DQ[q], a = alphaOf(q);
    const cObj = DATA.corridors.find(c => c.code === state.corridor);
    const md = METRIC_DEF[state.metric];
    const v = VIEW.ser[q];
    const lines = [[T('dPaid'), bn(PT[q])]];
    if (v != null) lines.push([T(md.label), md.fmt(v)]);
    if (d) lines.push([T('dWorkers'), nf(NATS.reduce((s, n) => s + d.stock[n], 0), 0)]);
    if (cObj && a) {
      lines.push([T('dShare'), pct(a[cObj.code])]);
      lines.push([T('dFlow'), bn(flowOf(q, cObj.code))]);
    }
    const fx = cObj && a
      ? `${T('gradeB')}: ${Math.round(state.pool * 100)}% × ${mb(PT[q])} × ${(a[cObj.code] * 100).toFixed(1)}%`
      : `${T('gradeA')} · BOT ${DATA.meta.sources[0].table}`;
    tip.innerHTML = `<div class="tt">${q}${cObj ? ' · ' + cname(cObj) : ''}</div>
      <table>${lines.map(([k, val]) => `<tr><td>${k}</td><td style="text-align:right">${val}</td></tr>`).join('')}</table>
      <div class="fx">${fx}</div>`;
    placeTip(ev);
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  function paintChrome() {
    // touch only our own classes -- a host page may own others on <body>
    document.getElementById('stamp').textContent =
      `${T('stamp')} · ${Q[Q.length - 1]} · ${DATA.meta.built}`;
    document.getElementById('h1').textContent = T('h1');
    document.getElementById('dek').innerHTML = T('dek');
    document.title = 'Mekong Remittance Corridors';
  }
  /* One line saying what the page is now showing, for the reader who cannot
     see that eight panels just changed under them. Only the three controls that
     rewrite the whole page speak; the month and province controls are local and
     the control the reader activated already names itself. */
  function announce() {
    const el = document.getElementById('status');
    if (!el) return;
    const cObj = DATA.corridors.find(c => c.code === state.corridor);
    el.textContent = [cObj ? cname(cObj) : T('all'), T(METRIC_DEF[state.metric].label),
      state.measuredOnly ? T('stMeasured') : T('stAll')].join(' · ');
  }
  function renderAll() {
    paintChrome(); renderFacts(); renderControls(); renderBoard(); renderDetail();
    renderRank(); renderFlows(); renderContext(); renderChart(); renderMap();
    renderTable(); renderAbout(); markTrace(); announce();
    writeHash();
  }

  /* Every list on this page re-renders by replacing innerHTML, which throws
     away the node the keyboard was standing on. Activating a quarter cell or a
     ranking row therefore dropped focus to <body>, sending a keyboard reader
     back to the top of the document on every single selection. Remember what
     was focused by the data it carries and by the list it belongs to, then put
     focus on whatever node now stands for the same thing. Selections that make
     their own row vanish -- toggling off a pinned province -- fall back to the
     first row of the same list, which keeps the reader where they were.
     preventScroll, because the element is by definition already in view and
     the smooth-scroll layer should not be asked to move. */
  function keepFocus(render) {
    const a = document.activeElement;
    const chip = a && a.closest && a.closest('button.chip');
    const th = a && a.closest && a.closest('th[data-k]');
    const cell = a && a.closest && a.closest('.cell[data-q]');
    const row = a && a.closest && a.closest('.row[data-p], .row[data-c]');
    let sel = null;
    if (chip) {
      const k = ['c', 'm', 'g', 'map', 'mass'].find(n => chip.dataset[n] != null);
      if (k) sel = `button.chip[data-${k}="${chip.dataset[k]}"]`;
    } else if (th) sel = `th[data-k="${th.dataset.k}"] .sortbtn`;
    else if (cell) sel = `.cell[data-q="${cell.dataset.q}"]`;
    else if (row) sel = row.dataset.p ? `.row[data-p="${row.dataset.p}"]`
                                      : `.row[data-c="${row.dataset.c}"]`;
    const anchor = chip || th || cell || row;
    const hostId = sel && anchor.closest('[id]') ? anchor.closest('[id]').id : null;
    render();
    if (!sel) return;
    const scope = (hostId && document.getElementById(hostId)) || document;
    const next = scope.querySelector(sel)
      || (hostId ? scope.querySelector('.row, .cell, .chip, .sortbtn') : null);
    if (next && next.focus) next.focus({preventScroll: true});
  }

  document.addEventListener('click', e => keepFocus(() => onClick(e)));
  function onClick(e) {
    const b = e.target.closest('button.chip');
    if (b) {
      if (b.disabled) return;
      if (b.dataset.mass) { massMode = massMode === 'auto' ? 'flat' : 'auto';
        massP = massMode === 'flat' ? 0 : massTarget(); renderMap(); writeHash(); return; }
      if (b.dataset.map) { mapMetric = b.dataset.map; renderMap(); writeHash(); return; }
      if (b.dataset.c) state.corridor = b.dataset.c;
      else if (b.dataset.m) state.metric = b.dataset.m;
      else if (b.dataset.g) state.measuredOnly = b.dataset.g === 'm';
      renderAll();
      return;
    }
    const cell = e.target.closest('.cell[data-q]');
    if (cell) { state.sel = state.sel === cell.dataset.q ? null : cell.dataset.q; renderBoard(); renderDetail(); writeHash(); return; }
    const row = e.target.closest('.rank .row[data-c]');
    if (row) { state.corridor = row.dataset.c; renderAll(); return; }
    const prov = e.target.closest('[data-p]');
    if (prov) { state.province = state.province === prov.dataset.p ? null : prov.dataset.p;
      renderMap(); writeHash(); return; }
    const th = e.target.closest('#thead th[data-k]');
    if (th) {
      if (state.sortKey === th.dataset.k) state.sortDir *= -1;
      else { state.sortKey = th.dataset.k; state.sortDir = -1; }
      renderTable();
    }
  }
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.hasAttribute('data-month')) {
      mapMonth = PV_KEYS[+t.value] || mapMonth;
      renderMap();
      writeHash();
      return;
    }
    if (t.hasAttribute('data-pool')) { state.pool = +t.value / 100; }
    else if (t.dataset.prop) { state.prop[t.dataset.prop] = +t.value / 100; }
    else return;
    const box = document.getElementById('asmBox').open;
    renderControls(); document.getElementById('asmBox').open = box;
    renderBoard(); renderDetail(); renderRank(); renderFlows(); renderChart();
    renderMap(); renderTable(); markTrace(); writeHash();
  });
  // The board cells were already operable from the keyboard. The three ranking
  // lists were not, and the province ranking was the only keyboard route to a
  // province at all -- the map itself answers to the mouse alone.
  document.addEventListener('keydown', e => {
    const hit = e.target.closest
      && e.target.closest('.cell[data-q], .rank .row[data-c], .row[data-p]');
    if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); hit.click(); }
  });
  function showProvTip(code, ev) {
    const snap = PV.months[mapMonth];
    const d = snap && snap.by_code[code];
    const p = PV_BY_CODE[code];
    if (!d || !p) { tip.classList.remove('on'); return; }
    const tot = NATS.reduce((s, n) => s + (d[n] || 0), 0);
    const rows = DATA.corridors.map(c => {
      const v = d[c.code] || 0;
      return `<tr><td>${cname(c)}</td><td style="text-align:right">${nf(v, 0)}</td>`
        + `<td style="text-align:right;color:var(--ink-3)">${tot ? pct(v / tot, 0) : ''}</td></tr>`;
    }).join('');
    tip.innerHTML = `<div class="tt">${p.en}</div>`
      + `<table><tr><td><b>${T('mWorkersProv')}</b></td>`
      + `<td style="text-align:right"><b>${nf(tot, 0)}</b></td><td></td></tr>${rows}</table>`
      + `<div class="fx">${mapMonth} · ${T('gradeA')}</div>`;
    placeTip(ev);
  }

  function markChart(hit) {
    const svg = hit.ownerSVGElement;
    const cross = svg.querySelector('.cross'), hot = svg.querySelector('.hot');
    if (cross) { cross.setAttribute('x1', hit.dataset.cx); cross.setAttribute('x2', hit.dataset.cx);
      cross.style.visibility = 'visible'; }
    if (hot) { hot.setAttribute('cx', hit.dataset.cx); hot.setAttribute('cy', hit.dataset.cy);
      hot.style.visibility = 'visible'; }
  }
  function hideChartMark() {
    document.querySelectorAll('svg.chart .cross, svg.chart .hot')
      .forEach(el => { el.style.visibility = 'hidden'; });
  }
  /* The readout names what the pointer is over. On a plan drawing and a squared
     grid that is a reading, so it is set in the annotation hand and sits on the
     paper rather than on any sheet. One update per frame. */
  const RO = {x: document.getElementById('roX'), y: document.getElementById('roY'),
              at: document.getElementById('roAt'), label: document.getElementById('roLabel')};
  let roFrame = false, roLast = null;
  function readout(e) {
    if (!RO.x) return;
    // Page coordinates, not viewport: the reading is a position on the drawing,
    // which is what a coordinate readout on a plan is for. It also keeps rising
    // as you scroll the sheet instead of resetting at every fold.
    RO.x.textContent = String(Math.round(e.pageX)).padStart(4, '0');
    RO.y.textContent = String(Math.round(e.pageY)).padStart(4, '0');
    let what = T('roSheet'), kind = T('roOver');
    const t = e.target && e.target.closest ? e.target : null;
    if (t) {
      const cell = t.closest('.cell[data-q]');
      const path = t.closest('svg.map path[data-p]');
      const row  = t.closest('#rank .row[data-c], #provRank .row[data-p]');
      const flow = t.closest('.flow');
      if (cell) { kind = T('roQuarter');
        what = cell.dataset.q + (cell.classList.contains('nd') ? '  ' + T('roWithheld') : ''); }
      else if (path) { const pv = PV_BY_CODE[path.dataset.p];
        kind = T('roProvince'); what = pv ? pv.en : path.dataset.p; }
      else if (row && row.dataset.c) { const c = DATA.corridors.find(x => x.code === row.dataset.c);
        kind = T('roCorridor'); what = c ? cname(c) : row.dataset.c; }
      else if (row && row.dataset.p) { const pv = PV_BY_CODE[row.dataset.p];
        kind = T('roProvince'); what = pv ? pv.en : row.dataset.p; }
      else if (flow) { kind = T('roCorridor');
        what = (flow.querySelector('.fn') || {}).firstChild
          ? flow.querySelector('.fn').firstChild.textContent.trim() : what; }
      else { const panel = t.closest('.panel,.board,.hero,.about');
        const h = panel && panel.querySelector('h1,h2');
        if (h && h.textContent.trim()) { kind = T('roSheetLabel'); what = h.textContent.trim(); } }
    }
    if (what !== roLast) { RO.at.textContent = what; RO.label.textContent = kind; roLast = what; }
  }

  document.addEventListener('mousemove', e => {
    if (!roFrame) { roFrame = true; requestAnimationFrame(() => { roFrame = false; readout(e); }); }
    if (!e.target.closest) { tip.classList.remove('on'); hideChartMark(); return; }
    const cell = e.target.closest('.cell[data-q]');
    if (cell) { hideChartMark(); showTip(cell.dataset.q, e); return; }
    const hit = e.target.closest('svg.chart rect.hit');
    if (hit) { markChart(hit); showTip(hit.dataset.q, e); return; }
    hideChartMark();
    const path = e.target.closest('svg.map path[data-p]');
    if (path) { showProvTip(path.dataset.p, e); return; }
    tip.classList.remove('on');
  });
  document.addEventListener('mouseleave', () => { tip.classList.remove('on'); hideChartMark(); });

  readHash();
  // Open on the most recent quarter that carries a figure, so the detail panel
  // arrives with something in it instead of an instruction.
  if (!state.sel) state.sel = Q.slice().reverse().find(q => PT[q] != null) || null;
  renderAll();



  // the single-file build handed these to window.MRC; a caller gets them now
  return {
    attachLenis,
    setMass(p) { massP = p; applyMass(); setProgress(p); },
    get scroll() { return {lenis: !!lenis, massP}; },
    state, DATA,
  };
}
