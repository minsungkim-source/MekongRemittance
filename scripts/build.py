#!/usr/bin/env python3
"""Normalise every raw pull into one dataset the page embeds verbatim.

Nothing here models corridor values -- that happens in the browser so the
assumption sliders can move. What this does is: line up periods, compute the
measured seasonal factors, roll the monthly work-permit stock up to quarters,
mark definitional breaks, and record what each number's evidence grade is.
"""
import json, os, statistics as st

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = f"{ROOT}/data/raw", f"{ROOT}/data/build"
BUILT = "2026-08-25"          # passed in rather than read from the clock

def load(name):
    return json.load(open(f"{RAW}/{name}"))

def qkey(p):
    q, y = p.split("/")
    return f"{y}Q{q[1]}"

# ── BOT: quarterly personal transfers ───────────────────────────────────
bot = load("bot_personal_transfers.json")
pt = {side: {qkey(k): v for k, v in d.items()}
      for side, d in bot["personal_transfers"].items()}
allq = sorted(pt["payments"], key=lambda s: (s[:4], s[5]))

# BOT prints 0.00 for personal-transfer PAYMENTS before the breakout starts --
# a placeholder for "not separated", not a quarter in which nobody sent money
# home. Left in, it would invent a series start and drag the seasonal factors
# toward zero, so the axis begins at the first real observation.
first = next(q for q in allq if pt["payments"][q])
quarters = [q for q in allq if q >= first]
zeroed = [q for q in allq if q < first]
prov = {qkey(p) for p in bot["meta"]["provisional"]}

def seasonal(series, keys, since=None):
    """Ratio-to-centred-moving-average factors, normalised to average 1.00."""
    v = [series[k] for k in keys]
    n = len(v)
    buckets = {1: [], 2: [], 3: [], 4: []}
    ratios = {}
    for i in range(2, n - 2):
        ma = (0.5 * v[i - 2] + v[i - 1] + v[i] + v[i + 1] + 0.5 * v[i + 2]) / 4
        if not ma:
            continue
        ratios[keys[i]] = v[i] / ma
        if since and int(keys[i][:4]) < since:
            continue
        buckets[int(keys[i][5])].append(v[i] / ma)
    if not all(buckets.values()):
        return None, ratios
    med = {q: st.median(buckets[q]) for q in (1, 2, 3, 4)}
    k = 4 / sum(med.values())
    return {f"Q{q}": round(med[q] * k, 4) for q in (1, 2, 3, 4)}, ratios

fac_all, si_all = seasonal(pt["payments"], quarters)
fac_recent, _ = seasonal(pt["payments"], quarters, since=2016)
fac_recv, _ = seasonal(pt["receipts"], quarters, since=2016)

# ── DOE: monthly work-permit stock by nationality ───────────────────────
doe = load("doe_stock_raw.json")
months = doe["months"]
mk = sorted(months)
NATS = ["MM", "KH", "LA", "VN"]

# ── regimes ────────────────────────────────────────────────────────────
# The source table's column set is rewritten with each cabinet resolution and
# its unit switched from positions to persons partway through, so the level
# series is NOT continuous. Cut it into regimes at every step change, unit
# change or gap, drop regimes too short to be anything but an artefact, and
# never join across a boundary.
STEP = 0.20
MIN_REGIME = 3

def midx(m):
    y, mo = m.split("-")
    return int(y) * 12 + int(mo)

segs, cur = [], []
for i, m in enumerate(mk):
    tot = sum(months[m]["by_nationality"].values())
    unit = months[m].get("unit", "unknown")
    if cur:
        pm = cur[-1]
        ptot = sum(months[pm]["by_nationality"].values())
        cut = (midx(m) - midx(pm) != 1
               or months[pm].get("unit", "unknown") != unit
               or (ptot and abs(tot - ptot) / ptot > STEP))
        if cut:
            segs.append(cur)
            cur = []
    cur.append(m)
if cur:
    segs.append(cur)

regimes, dropped = [], []
for seg in segs:
    if len(seg) < MIN_REGIME:
        dropped.extend(seg)
        continue
    regimes.append({"id": f"R{len(regimes) + 1}", "from": seg[0], "to": seg[-1],
                    "months": len(seg),
                    "unit": months[seg[0]].get("unit", "unknown")})
regime_of = {}
for seg, r in zip([s for s in segs if len(s) >= MIN_REGIME], regimes):
    for m in seg:
        regime_of[m] = r["id"]

# ── national vs province cross-check ───────────────────────────────────
# Both come from the same reports but from different tables, parsed by different
# code. Where they disagree by a wide margin one of them is wrong and nothing
# downstream should quietly use either. The 2023 layout lists a nationality in
# both panels of the national cross-tab, with different permit categories in
# each, and the reader picks up only one of the two -- understating Laos roughly
# threefold. This is what catches that instead of shipping it.
DISPUTE_TOL = 0.20          # ±20% before a month is called disputed
DISPUTE_FLOOR = 50_000      # nationalities too small for the test to mean anything

_pv_path = f"{RAW}/doe_province_raw.json"
_pv_raw = json.load(open(_pv_path))["months"] if os.path.exists(_pv_path) else {}

disputed = {}
for m, rec in sorted(_pv_raw.items()):
    nat = months.get(m, {}).get("by_nationality")
    if not nat:
        continue
    got_all = rec.get("summed", {})
    bad = {}
    for n, national in nat.items():
        if national < DISPUTE_FLOOR:
            continue
        got = got_all.get(n)
        if not got:
            continue
        # the province tables cover a subset of the permit categories, so they
        # should land at or a little under the national figure, never far above
        ratio = got / national
        if ratio > 1 + DISPUTE_TOL:
            bad[n] = round(ratio, 3)
    if bad:
        disputed[m] = bad

disputed_quarters = sorted({f"{m[:4]}Q{(int(m[5:7]) - 1) // 3 + 1}" for m in disputed})

# ── quarterly roll-up, regime-aware ────────────────────────────────────
# Shares between nationalities inside one month are internally consistent;
# levels are only comparable inside a regime. A quarter that straddles a
# regime boundary or contains a dropped month is not published.
dq = {}
for m in mk:
    if m in dropped:
        continue
    y, mo = m.split("-")
    dq.setdefault(f"{y}Q{(int(mo) - 1) // 3 + 1}", []).append(m)

doe_q = {}
disputed_quarters = []
for q, ms in sorted(dq.items()):
    if {regime_of[m] for m in ms} != {regime_of[ms[0]]}:
        continue                       # straddles a regime boundary
    if any(m in disputed for m in ms):
        disputed_quarters.append(q)
    ms = [m for m in ms if m not in disputed]
    if not ms:
        continue                       # nothing trustworthy left in the quarter
    tot = {n: st.mean([months[m]["by_nationality"].get(n, 0) for m in ms]) for n in NATS}
    s = sum(tot.values())
    if not s:
        continue
    doe_q[q] = {"stock": {n: round(tot[n]) for n in NATS},
                "share": {n: round(tot[n] / s, 6) for n in NATS},
                "months": len(ms), "regime": regime_of[ms[0]],
                "unit": months[ms[0]].get("unit", "unknown")}

for r in regimes:
    r["quarters"] = sorted(q for q, v in doe_q.items() if v["regime"] == r["id"])

# ── provinces ──────────────────────────────────────────────────────────
# The province tables are parsed from the same PDFs but they only cover four of
# the permit categories, so their sum is always short of the national count. A
# month is published only if it reconciles: near-complete province coverage, the
# expected column order, Myanmar largest, and 80-105% of the national total.
EXPECTED_ORDER = ["MM", "LA", "KH", "VN"]
pv_path = f"{RAW}/doe_province_raw.json"
pv_months, pv_reject = {}, []
if os.path.exists(pv_path):
    pv_raw = json.load(open(pv_path))["months"]
    for m, rec in sorted(pv_raw.items()):
        nat = months.get(m, {}).get("by_nationality")
        why = None
        # The column order is not asserted: reconciliation against the national
        # by-nationality totals is a stronger test of it than any fixed list,
        # since Myanmar and Cambodia differ by a factor of three.
        if sorted(rec.get("order") or []) != sorted(EXPECTED_ORDER):
            why = f"column set {rec.get('order')}"
        elif rec["coverage"] < 70:
            why = f"only {rec['coverage']} provinces"
        elif not nat:
            why = "no national row to reconcile against"
        else:
            s_ = rec["summed"]
            if s_.get("MM", 0) < s_.get("KH", 0):
                why = "Myanmar not the largest nationality"
            else:
                cov = {n: (s_.get(n, 0) / nat[n]) for n in EXPECTED_ORDER if nat.get(n)}
                # Only gate on nationalities large enough for the check to mean
                # something: Viet Nam is a few thousand people and is absent from
                # one of the four tables, so its ratio is noise, not evidence.
                gated = {n: v for n, v in cov.items() if nat[n] >= 50_000}
                if not gated:
                    why = "no nationality large enough to reconcile"
                elif min(gated.values()) < 0.80 or max(gated.values()) > 1.05:
                    why = "reconciliation " + ", ".join(f"{n}={cov[n]*100:.0f}%" for n in cov)
        if why:
            pv_reject.append({"month": m, "why": why})
            continue
        s_ = rec["summed"]
        pv_months[m] = {
            "order": rec["order"],
            "by_code": {c: {n: v.get(n, 0) for n in EXPECTED_ORDER}
                        for c, v in rec["provinces"].items()},
            "coverage": {n: round(s_.get(n, 0) / nat[n], 4) for n in EXPECTED_ORDER if nat.get(n)},
            "provinces": rec["coverage"],
            "regime": regime_of.get(m),
        }

# publish the most recent accepted month, plus the earliest accepted month in the
# same run, so the map can show a within-run change without crossing a boundary
pv_keys = sorted(pv_months)
pv_latest = pv_keys[-1] if pv_keys else None
pv_base = None
if pv_latest:
    reg = pv_months[pv_latest]["regime"]
    if reg:                     # a month outside every run has no run to compare within
        same = [m for m in pv_keys if pv_months[m]["regime"] == reg and m != pv_latest]
        pv_base = same[0] if same else None

PROV_GEO = json.load(open(f"{RAW}/th_provinces.json"))

# ── World Bank ──────────────────────────────────────────────────────────
def wb(name, key="countryiso3code"):
    d = load(name)
    out = {}
    for r in d[1]:
        if r["value"] is None:
            continue
        out.setdefault(r[key], {})[r["date"]] = r["value"]
    return out, d[0].get("lastupdated")

inflow, wb_upd = wb("wb_clmv_recv.json")
fx, _ = wb("wb_fx.json")
paid, _ = wb("wb_tha_paid.json")
gdp, _ = wb("wb_gdp.json")

CORRIDORS = [
    {"code": "MM", "iso3": "MMR", "en": "Myanmar",  "th": "เมียนมา",  "ko": "미얀마"},
    {"code": "KH", "iso3": "KHM", "en": "Cambodia", "th": "กัมพูชา",  "ko": "캄보디아"},
    {"code": "LA", "iso3": "LAO", "en": "Laos",     "th": "ลาว",      "ko": "라오스"},
    {"code": "VN", "iso3": "VNM", "en": "Viet Nam", "th": "เวียดนาม", "ko": "베트남"},
]

# ── festival windows, at month granularity ──────────────────────────────
# Lunar dates shift within the month year to year, so the page never claims a
# day. Quarter is what the measured data can actually be read against.
FESTIVALS = [
    {"code": "MM", "months": [4],      "q": 2, "en": "Thingyan (new year)"},
    {"code": "KH", "months": [4],      "q": 2, "en": "Choul Chnam Thmey (new year)"},
    {"code": "LA", "months": [4],      "q": 2, "en": "Pi Mai (new year)"},
    {"code": "TH", "months": [4],      "q": 2, "en": "Songkran"},
    {"code": "KH", "months": [9, 10],  "q": 3, "en": "Pchum Ben"},
    {"code": "MM", "months": [10],     "q": 4, "en": "Thadingyut"},
    {"code": "LA", "months": [10, 11], "q": 4, "en": "Ok Phansa / That Luang"},
    {"code": "KH", "months": [11],     "q": 4, "en": "Bon Om Touk"},
    {"code": "VN", "months": [1, 2],   "q": 1, "en": "Tet"},
]

SOURCES = [
    {"id": "bot", "grade": "A", "name": "Bank of Thailand -- Balance of Payments",
     "table": bot["meta"]["table"], "freq": "quarterly",
     "as_of": f"{quarters[-1]} (updated {bot['meta']['last_updated']})",
     "unit": "million baht", "url": bot["meta"]["url"],
     "note": f"Secondary income, payments, line 2.1 Personal transfers. Covers formal channels only. The table prints 0.00 for this line before {first} -- {len(zeroed)} quarters that are a placeholder for 'not separated', not zero flows -- so the series here starts at {first}."},
    {"id": "bot_m", "grade": "A", "name": "Bank of Thailand -- Balance of Payments (summary)",
     "table": "EC_XT_046_S2", "freq": "monthly", "as_of": "not used",
     "unit": "million baht",
     "url": "https://app.bot.or.th/BTWS_STAT/statistics/BOTWEBSTAT.aspx?reportID=952&language=ENG",
     "note": "Checked and rejected: the monthly table reports services, primary and secondary income as one combined line, so personal transfers cannot be separated monthly."},
    {"id": "doe", "grade": "A", "name": "Department of Employment (Thailand) -- monthly foreign worker report",
     "table": "stock of work permits by immigration channel, alien type and nationality",
     "freq": "monthly", "as_of": f"{mk[-1]} ({len(mk)} months parsed)",
     "unit": "persons / positions (varies -- see note)", "url": doe["meta"]["url"],
     "note": ("Parsed from the report PDFs. The table's column set changes with each cabinet resolution "
              "and its unit switched from positions to persons, so levels are not strictly comparable "
              "across years; shares between nationalities within a month are. Every month is cross-checked "
              "against the province tables parsed separately from the same reports, and withheld where the "
              "two disagree by more than 20%. That currently withholds "
              + (", ".join(disputed_quarters) if disputed_quarters else "no quarters")
              + ": in the 2023 layout the cross-tab lists each nationality in both panels with different "
                "permit categories in each, and the reader captures only one of the two, understating Laos "
                "roughly threefold. Those quarters carry no corridor split rather than a wrong one.")},
    {"id": "wb_rem", "grade": "A", "name": "World Bank WDI -- personal remittances",
     "table": "BX.TRF.PWKR.CD.DT / BM.TRF.PWKR.CD.DT", "freq": "annual",
     "as_of": f"updated {wb_upd}", "unit": "current US$",
     "url": "https://api.worldbank.org/v2/country/KHM;LAO;MMR;VNM/indicator/BX.TRF.PWKR.CD.DT",
     "note": "Receiving-country totals from all sources, not Thailand alone. Myanmar's series stops at 2019 and Viet Nam's at 2004."},
    {"id": "wb_fx", "grade": "A", "name": "World Bank WDI -- official exchange rate",
     "table": "PA.NUS.FCRF", "freq": "annual (period average)", "as_of": f"updated {wb_upd}",
     "unit": "baht per US$", "url": "https://api.worldbank.org/v2/country/THA/indicator/PA.NUS.FCRF",
     "note": "Used only to put baht figures next to the receiving countries' dollar statistics."},
    {"id": "wb_gdp", "grade": "A", "name": "World Bank WDI -- GDP",
     "table": "NY.GDP.MKTP.CD", "freq": "annual", "as_of": f"updated {wb_upd}",
     "unit": "current US$", "url": "https://api.worldbank.org/v2/country/KHM;LAO;MMR;VNM;THA/indicator/NY.GDP.MKTP.CD",
     "note": "Denominator for the receiving-country context figures."},
    {"id": "doe_prov", "grade": "A", "name": "Department of Employment (Thailand) — province tables",
     "table": "sections 59 MOU, 64 and 63/2 by province and nationality",
     "freq": "monthly", "as_of": (f"{pv_latest} ({len(pv_months)} months reconciled, "
                                  f"{len(pv_reject)} rejected)" if pv_latest else "NOT AVAILABLE"),
     "unit": "persons / positions", "url": doe["meta"]["url"],
     "note": "Parsed from positioned glyphs, not flattened text, because values that overflow their cell fuse with the neighbour. A row is kept only if its total equals male + female and the grand total equals the sum of the nationality columns. These four tables cover most but not all permit categories, so the province sum runs a few per cent below the national count — the shortfall is shown on the map."},
    {"id": "geo", "grade": "A", "name": "Province boundaries",
     "table": "77 provinces, simplified", "freq": "static", "as_of": "NSO ArcGIS",
     "unit": "degrees", "url": PROV_GEO["meta"]["via"],
     "note": PROV_GEO["meta"]["note"]},
    {"id": "survey", "grade": "A", "name": "World Bank / ILO migrant worker surveys",
     "table": "CLM Migration Survey 2024 (n=1,770); ILO synthesis 2010",
     "freq": "one-off", "as_of": "2024 fieldwork",
     "unit": "various",
     "url": "https://documents1.worldbank.org/curated/en/099080125060021383/pdf/P502556-496a94ef-af78-4a98-a3ef-608bb3af29c7.pdf",
     "note": "Read for context and for the reasoning behind the two assumptions, never as an input to a published figure. The 2024 survey covers 1,770 workers (Cambodia 459, Lao PDR 307, Myanmar 1,004; 45% regular, 55% irregular): CLM migrants remit about 8 times a year, fewer than 15% by bank transfer and 10% among Lao workers, and the cost they report paying is under 2%. Remittances were 5.5% of Cambodia's GDP in 2024, 1.5% of Lao PDR's and 1.7% of Myanmar's. Its per-nationality amounts appear only as a chart, so they cannot be lifted; the one source that prints them as text is the ILO's 2010 synthesis (median about 30,000 baht over two years for Myanmar against 20,000 for Cambodia), which is too old to calibrate with."},
    {"id": "rpw", "grade": "-", "name": "Remittance Prices Worldwide -- corridor cost",
     "table": "Thailand->Myanmar / Cambodia / Laos", "freq": "quarterly",
     "as_of": "NOT WIRED", "unit": "% of amount sent",
     "url": "https://remittanceprices.worldbank.org/",
     "note": "Wanted, not obtained. The site is behind a bot challenge and the World Bank API's RPW tables were last updated in December 2020, so no current corridor price is published here rather than shown stale."},
    {"id": "origin", "grade": "-", "name": "Origin-country central banks (NBC, BOL, CBM)",
     "table": "monthly remittance receipts", "freq": "--", "as_of": "NOT FOUND",
     "unit": "--", "url": "",
     "note": "Searched for a monthly published series to cross-check the corridor split against. None found in the open. Recorded as absent rather than estimated."},
]

data = {
    "meta": {
        "built": BUILT,
        "bot_unit": "million baht",
        "quarters": quarters,
        "payments_from": first,
        "payments_placeholder_quarters": len(zeroed),
        "receipts_from": allq[0],
        "provisional": sorted(prov),
        "doe_regimes": regimes,
        "doe_dropped": dropped,
        "doe_disputed": disputed,
        "doe_disputed_quarters": disputed_quarters,
        "doe_months": len(mk),
        "doe_range": [mk[0], mk[-1]],
        "sources": SOURCES,
    },
    "pt": {"payments": {k: round(pt["payments"][k], 2) for k in quarters},
           "receipts": {k: round(pt["receipts"][k], 2) for k in quarters}},
    "seasonal": {"payments_all": fac_all, "payments_2016": fac_recent,
                 "receipts_2016": fac_recv,
                 "index": {k: round(v, 4) for k, v in si_all.items()}},
    "doe": {"quarters": doe_q, "months": {m: months[m]["by_nationality"] for m in mk},
            "units": {m: months[m].get("unit", "unknown") for m in mk}},
    "wb": {"inflow": inflow, "tha_paid": paid.get("THA", {}), "gdp": gdp,
           "fx": fx.get("THA", {}), "updated": wb_upd},
    "prov": {"months": pv_months, "latest": pv_latest, "base": pv_base,
             "rejected": pv_reject,
             "regions": PROV_GEO["regions"],
             "list": PROV_GEO["provinces"],
             "geo": PROV_GEO["geo"]},
    "corridors": CORRIDORS,
    "festivals": FESTIVALS,
}

os.makedirs(OUT, exist_ok=True)
json.dump(data, open(f"{OUT}/dataset.json", "w"), separators=(",", ":"), ensure_ascii=False)
sz = os.path.getsize(f"{OUT}/dataset.json")

print(f"quarters        {len(quarters)}  {quarters[0]} -> {quarters[-1]}   (dropped {len(zeroed)} placeholder quarters)")
print(f"seasonal (all)  " + "  ".join(f"{k}={v}" for k, v in fac_all.items()))
print(f"seasonal (2016) " + "  ".join(f"{k}={v}" for k, v in fac_recent.items()))
print(f"doe months      {len(mk)}  {mk[0]} -> {mk[-1]}")
for r in regimes:
    print(f"  {r['id']:3} {r['from']} .. {r['to']}  {r['months']:3}mo  {r['unit'][:9]:>9}  {len(r['quarters'])}q")
print(f"doe dropped     {len(dropped)} months: {dropped}")
print(f"doe quarters    {len(doe_q)}  {sorted(doe_q)[0]} -> {sorted(doe_q)[-1]}")
u = {}
for m in mk: u[months[m].get('unit')] = u.get(months[m].get('unit'), 0) + 1
print(f"doe units       {u}")
print(f"wb inflow       " + "  ".join(f"{c}:{max(v)}" for c, v in sorted(inflow.items())))
print(f"disputed        {len(disputed)} month(s) where province > national by >{DISPUTE_TOL:.0%}"
      + (f"  -> quarters dropped: {', '.join(disputed_quarters)}" if disputed else ""))
for m in sorted(disputed)[:3]:
    print(f"   {m}: " + ", ".join(f"{n} x{r}" for n, r in disputed[m].items()))
print(f"provinces       {len(pv_months)} accepted, {len(pv_reject)} rejected"
      + (f"  latest={pv_latest} base={pv_base}" if pv_latest else ""))
for r in pv_reject[:6]:
    print(f"   reject {r['month']}: {r['why']}")
if pv_latest:
    print("   coverage vs national: " + ", ".join(
        f"{k}={v*100:.1f}%" for k, v in pv_months[pv_latest]["coverage"].items()))
print(f"dataset         {sz/1024:.1f} KB")
