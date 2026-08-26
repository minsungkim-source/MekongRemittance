#!/usr/bin/env python3
"""Monthly stock of work-permit holders by nationality, from the Thai
Department of Employment's monthly foreign-worker report.

Each month publishes several PDFs under /prd/download/download_by_pool_file/<id>;
only the full report carries the "4 nationalities" summary board, so we try the
month's ids until one parses. Nothing is inferred: a month that will not parse is
recorded as missing.

Usage: fetch_doe.py [from YYYY-MM] [to YYYY-MM]
"""
import json, os, re, sys, unicodedata, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = f"{ROOT}/data/raw/doe_pdf"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"

# Nationality labels as they appear on the summary board, in Thai.
NAT = {"KH": "กัมพูชา", "MM": "เมียนมา", "LA": "ลาว", "VN": "เวียดนาม"}
NAT_ALT = {"MM": ["พม่า"]}          # older reports say Burma, not Myanmar
MARKS = dict.fromkeys(
    [0x0E31] + list(range(0x0E34, 0x0E3B)) + list(range(0x0E47, 0x0E4F)))

def bare(s):
    """Drop Thai combining marks -- some report fonts extract without them."""
    return unicodedata.normalize("NFC", s).translate(MARKS)

BARE_NAT = {k: bare(v) for k, v in NAT.items()}
BARE_ALT = {k: [bare(a) for a in v] for k, v in NAT_ALT.items()}

def fetch(pool_id):
    path = f"{CACHE}/{pool_id}.pdf"
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return path
    req = urllib.request.Request(
        f"https://www.doe.go.th/prd/download/download_by_pool_file/{pool_id}",
        headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            blob = r.read()
    except (urllib.error.URLError, TimeoutError, OSError):
        return None
    if not blob.startswith(b"%PDF"):
        return None
    open(path, "wb").write(blob)
    return path

NUMLINE = re.compile(r'^[\s\d,\.\-]+$')

def parse_board(text):
    """Pull the four-nationality stock line off the summary board."""
    b = bare(text)
    lines = [l.strip() for l in b.split("\n")]
    for i, line in enumerate(lines):
        # the header line naming at least three of the four nationalities
        pos = {}
        for k, name in BARE_NAT.items():
            j = line.find(name)
            if j < 0:
                for alt in BARE_ALT.get(k, []):
                    j = line.find(alt)
                    if j >= 0: break
            if j >= 0: pos[k] = j
        if len(pos) < 4:
            continue
        order = [k for k, _ in sorted(pos.items(), key=lambda kv: kv[1])]
        # first following line that is four numbers
        for nxt in lines[i + 1:i + 5]:
            if not nxt or not NUMLINE.match(nxt):
                continue
            nums = re.findall(r'\d[\d,]*', nxt)
            if len(nums) != 4:
                continue
            vals = [int(n.replace(",", "")) for n in nums]
            if min(vals) <= 0 or max(vals) < 100000:
                continue
            return dict(zip(order, vals))
    return None

TOTAL4 = re.compile(r'4\s*' + bare("สัญชาติ") + r'\s*([\d,]{7,})')
ASOF = re.compile(bare("ข้อมูล ณ วันที่") + r'\s*(\d{1,2})\s*(\S+)\s*(\d{4})')
TH_MONTH = {m: i + 1 for i, m in enumerate(
    "มกราคม กุมภาพันธ์ มีนาคม เมษายน พฤษภาคม มิถุนายน กรกฎาคม สิงหาคม กันยายน ตุลาคม พฤศจิกายน ธันวาคม".split())}
BARE_MONTH = {bare(k): v for k, v in TH_MONTH.items()}

def parse_pdf(path):
    from pypdf import PdfReader
    try:
        pages = PdfReader(path).pages
    except Exception:
        return None
    for p in pages[:8]:
        try:
            t = p.extract_text() or ""
        except Exception:
            continue
        if bare("สัญชาติ") not in bare(t):
            continue
        nat = parse_board(t)
        if not nat:
            continue
        b = bare(t)
        rec = {"by_nationality": nat, "total4": sum(nat.values())}
        m = TOTAL4.search(b)
        if m:
            rec["total4_reported"] = int(m.group(1).replace(",", ""))
        m = ASOF.search(b)
        if m:
            mo = BARE_MONTH.get(m.group(2))
            if mo:
                rec["as_of"] = f"{int(m.group(3)) - 543}-{mo:02d}-{int(m.group(1)):02d}"
        return rec
    return None

def month_job(item):
    month, ids = item
    for pid in ids:
        path = fetch(pid)
        if not path:
            continue
        rec = parse_pdf(path)
        if rec:
            rec["source_id"] = pid
            return month, rec
    return month, None

def main():
    idx = json.load(open(f"{ROOT}/data/raw/doe_file_index.json"))
    lo = sys.argv[1] if len(sys.argv) > 1 else "2015-01"
    hi = sys.argv[2] if len(sys.argv) > 2 else "2099-12"
    todo = sorted((m, v) for m, v in idx.items() if lo <= m <= hi)
    os.makedirs(CACHE, exist_ok=True)

    out = {}
    prev = {}
    if os.path.exists(f"{ROOT}/data/raw/doe_monthly.json"):
        prev = json.load(open(f"{ROOT}/data/raw/doe_monthly.json")).get("months", {})
    with ThreadPoolExecutor(max_workers=4) as ex:
        for month, rec in ex.map(month_job, todo):
            if rec: out[month] = rec
            print(("  ok  " if rec else " MISS ") + month +
                  ("  " + "  ".join(f"{k}={rec['by_nationality'][k]:,}" for k in ("MM", "KH", "LA", "VN"))
                   if rec else ""), flush=True)
    merged = {**prev, **out}
    json.dump({"meta": {"source": "Department of Employment, Thailand -- monthly foreign worker report",
                        "url": "https://www.doe.go.th/prd/alien/statistic/param/site/152/cat/82/sub/0/pull/category/view/list-label",
                        "note": "stock of valid work permits by nationality, all permit categories"},
               "months": merged},
              open(f"{ROOT}/data/raw/doe_monthly.json", "w"), indent=1)
    print(f"\nparsed {len(out)}/{len(todo)} requested; file now holds {len(merged)} months")

if __name__ == "__main__":
    main()
