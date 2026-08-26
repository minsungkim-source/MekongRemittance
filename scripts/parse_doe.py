#!/usr/bin/env python3
"""Monthly stock of work permits by nationality, from the Thai Department of
Employment's monthly foreign-worker report.

The relevant table -- "aliens permitted to work remaining nationwide, by
immigration channel, alien type and nationality" -- is laid out as TWO
independent panels printed side by side. In extracted text both panels land on
the same lines, so a naive row read mixes (say) the Netherlands' figures into
Cambodia's. We therefore locate the right-hand panel's label column from the
header and split every line at that column before reading either side.

The report's unit changed from "positions" to "persons" partway through the
history, so the unit is recorded per month and never silently chained.

Usage: parse_doe.py [from YYYY-MM] [to YYYY-MM]
"""
import json, os, re, sys, unicodedata, urllib.request
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = f"{ROOT}/data/raw/doe_pdf"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
MARKS = dict.fromkeys([0x0E31] + list(range(0x0E34, 0x0E3B)) + list(range(0x0E47, 0x0E4F)))

def bare(s):
    """Strip Thai combining marks and spaces -- report fonts extract several
    different ways for the same word (จํา / จ า / จำ)."""
    return unicodedata.normalize("NFC", s).translate(MARKS).replace(" ", "")

NAT = {"KH": ["กัมพูชา"], "MM": ["เมียนมา", "พม่า"], "LA": ["ลาว"], "VN": ["เวียดนาม"]}
MARKCLASS = "\u0E31\u0E34-\u0E3A\u0E47-\u0E4E"

def flexre(name):
    """Match a Thai word even when extraction scatters spaces and drops marks."""
    core = [c for c in unicodedata.normalize("NFC", name)
            if c != " " and not re.match(f"[{MARKCLASS}]", c)]
    # at most two spaces between letters -- an unbounded \s* would happily
    # match one letter here and the next one across a column of padding
    joiner = f"[{MARKCLASS}]*\\s{{0,2}}[{MARKCLASS}]*"
    return re.compile(joiner.join(map(re.escape, core)))

RX = {k: [flexre(x) for x in v] for k, v in NAT.items()}
# minority / displaced rows that name a country but are a different population
EXCLUDE = [flexre(x) for x in ("พลัดถิ", "หลบหนีเข้าเมือง", "ลาวอพยพ", "อพยพเชื", "ไร้สัญชาติ")]

NEEDLE_TITLE = [bare("ประเภทคนต่างด้าว"), bare("สัญชาติ")]
NEEDLE_MONTH = bare("ข้อมูลณเดือน")
TOC = bare("สารบัญ")
UNIT_PERSON, UNIT_POST = bare("หน่วยนับ:คน"), bare("หน่วยนับ:ตําแหน่ง")

TH_MONTH = {bare(m): i + 1 for i, m in enumerate(
    "มกราคม กุมภาพันธ์ มีนาคม เมษายน พฤษภาคม มิถุนายน กรกฎาคม สิงหาคม กันยายน ตุลาคม พฤศจิกายน ธันวาคม".split())}
ASOF = re.compile(NEEDLE_MONTH + r'(\D+?)(\d{4})')
NUMRX = re.compile(r'\d[\d,]*')

def name_hits(line):
    """[(nationality, start, end)] for every nationality label in the line."""
    out = []
    for k, rxs in RX.items():
        for rx in rxs:
            for m in rx.finditer(line):
                out.append((k, m.start(), m.end()))
    return out

def split_at(lines):
    """The two panels print side by side; split at the widest column gap
    between nationality labels. None means a single-panel page."""
    cols = sorted({h[1] for l in lines for h in name_hits(l)})
    if len(cols) < 2:
        return None
    gaps = [(cols[i + 1] - cols[i], cols[i], cols[i + 1]) for i in range(len(cols) - 1)]
    g, a, b = max(gaps)
    # split immediately before the right panel's label column, not mid-gap:
    # the left panel's numeric columns run right up to it
    return max(0, b - 2) if g > 60 else None

def read_panel(seg):
    """Nationality and the numbers to its right, within one panel of one row."""
    hits = sorted(name_hits(seg), key=lambda h: h[1])
    if not hits:
        return None, []
    if any(rx.search(seg) for rx in EXCLUDE):
        return None, []
    k, _, end = hits[0]
    return k, [int(m.group(0).replace(",", "")) for m in NUMRX.finditer(seg[end:])]

def parse_page(lay):
    lines = lay.split("\n")
    sc = split_at(lines)
    agg, hits = {}, 0
    for l in lines:
        segs = [l] if sc is None else [l[:sc], l[sc:]]
        for seg in segs:
            k, vals = read_panel(seg)
            if not k or not vals:
                continue
            agg[k] = agg.get(k, 0) + sum(vals)
            hits += 1
    if len(agg) < 4 or hits < 4:
        return None
    if agg["MM"] < agg["KH"] or agg["VN"] > agg["LA"]:      # structural sanity
        return None
    # Whether these figures are complete is decided in build.py, by comparing
    # them with the province tables parsed independently from the same reports.
    return {"by_nationality": agg, "rows_read": hits, "split_col": sc}

def parse_pdf(path):
    from pypdf import PdfReader
    try:
        pages = PdfReader(path).pages
    except Exception:
        return None
    for p in pages:
        try:
            lay = p.extract_text(extraction_mode="layout") or ""
        except Exception:
            continue
        head = bare("\n".join(lay.split("\n")[:4]))
        if TOC in head or NEEDLE_MONTH not in head: continue
        if not all(n in head for n in NEEDLE_TITLE): continue
        rec = parse_page(lay)
        if not rec:
            continue
        bl = bare(lay)
        rec["unit"] = ("persons" if UNIT_PERSON in bl
                       else "positions" if UNIT_POST in bl else "unknown")
        m = ASOF.search(head)
        if m:
            for name, num in TH_MONTH.items():
                if name in bare(m.group(1)):
                    rec["as_of_month"] = f"{int(m.group(2)) - 543}-{num:02d}"
                    break
        return rec
    return None

def fetch(pool_id):
    path = f"{CACHE}/{pool_id}.pdf"
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return path
    req = urllib.request.Request(
        f"https://www.doe.go.th/prd/download/download_by_pool_file/{pool_id}",
        headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            blob = r.read()
    except Exception:
        return None
    if not blob.startswith(b"%PDF"):
        return None
    open(path, "wb").write(blob)
    return path

def job(item):
    month, ids = item
    for pid in sorted(ids, key=lambda i: -os.path.getsize(f"{CACHE}/{i}.pdf")
                      if os.path.exists(f"{CACHE}/{i}.pdf") else 0):
        path = fetch(pid)
        if not path or os.path.getsize(path) < 400000:
            continue
        rec = parse_pdf(path)
        if rec:
            rec["source_id"] = pid
            return month, rec
    return month, None

def main():
    idx = json.load(open(f"{ROOT}/data/raw/doe_file_index.json"))
    lo = sys.argv[1] if len(sys.argv) > 1 else "2019-01"
    hi = sys.argv[2] if len(sys.argv) > 2 else "2099-12"
    todo = sorted((m, v) for m, v in idx.items() if lo <= m <= hi)
    os.makedirs(CACHE, exist_ok=True)
    out = {}
    with ProcessPoolExecutor(max_workers=3) as ex:
        for month, rec in ex.map(job, todo):
            if rec:
                out[month] = rec
                n = rec["by_nationality"]
                print(f"  ok  {month}  " + " ".join(f"{k}={n.get(k,0):>9,}" for k in ("MM","KH","LA","VN"))
                      + f"  tot={sum(n.values()):>9,}  {rec['unit'][:7]:>7}"
                      + f"  rows={rec['rows_read']}", flush=True)
            else:
                print(f" MISS {month}", flush=True)
    json.dump({"meta": {"source": "Department of Employment (Thailand), monthly foreign worker report",
                        "table": "aliens permitted to work remaining nationwide, by immigration channel, alien type and nationality",
                        "url": "https://www.doe.go.th/prd/alien/statistic/param/site/152/cat/82/sub/0/pull/category/view/list-label"},
               "months": out}, open(f"{ROOT}/data/raw/doe_stock_raw.json", "w"), indent=1)
    print(f"\nparsed {len(out)}/{len(todo)}")

if __name__ == "__main__":
    main()
