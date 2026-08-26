#!/usr/bin/env python3
"""Work-permit stock by PROVINCE and nationality, from the DOE monthly report.

Four stock tables carry the province breakdown -- section 59 MOU, section 64
(border / seasonal) and the two section 63/2 cabinet-resolution groups -- so a
province's total is the sum across those four.

Each row is: label, employers, then one (total, male, female) triple for the
grand total and one per nationality. Reading that off the flattened text failed
because a value which overflows its cell fuses with its neighbour, so this works
from positioned glyphs instead: tokens carry their own x and y, rows are y
clusters, and the ordered numeric tokens in a row are the columns. Two identities
then have to hold for a row to be kept --

    total = male + female        for every triple
    grand total = sum of the nationality totals

-- and a row that fails either is dropped, never repaired.

Usage: parse_doe_prov.py [from YYYY-MM] [to YYYY-MM]
"""
import json, os, re, sys, unicodedata
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = f"{ROOT}/data/raw/doe_pdf"

def skel(s):
    """Reduce Thai text to the characters that survive every font quirk in these
    PDFs: consonants and full-character vowels. Tone marks extract as spaces or
    as replacement glyphs depending on the issue, so they go. Verified to leave
    all 77 province names distinct."""
    out = []
    for c in unicodedata.normalize("NFC", s):
        o = ord(c)
        if o == 0x0E33:            # sara am -- some fonts emit nikhahit + aa
            out.append("\u0E32")
        elif 0x0E01 <= o <= 0x0E2E or o in (0x0E30, 0x0E32, 0x0E45) or 0x0E40 <= o <= 0x0E44:
            out.append(c)
        elif c.isascii() and c.isalnum():
            out.append(c)
    return "".join(out)

PROVS = json.load(open(f"{ROOT}/data/raw/th_provinces.json"))["provinces"]
BY_SKEL = {skel(p["th"]): p["code"] for p in PROVS}
# Surat Thani is spelled three ways across these sources: the boundary file drops
# the ror-han, and the DOE reports use PATAK where the standard form uses DODEK.
# Alias the variants rather than edit either source.
for variant, canonical in (("สุราษฎร์ธานี", "สุราษฎ์ธานี"),
                           ("สุราษฏร์ธานี", "สุราษฎ์ธานี"),
                           ("สุราษฏ์ธานี", "สุราษฎ์ธานี")):
    if skel(canonical) in BY_SKEL:
        BY_SKEL[skel(variant)] = BY_SKEL[skel(canonical)]
NAT_SKEL = {"MM": skel("เมียนมา"), "LA": skel("ลาว"),
            "KH": skel("กัมพูชา"), "VN": skel("เวียดนาม")}
NATIONWIDE = skel("ทั่วราชอาณาจักร")
BY_PROVINCE = skel("รายจังหวัด")
NAT_WORD = skel("สัญชาติ")
TOC = skel("สารบัญ")
NEW_PERMITS = skel("อนุญาตทำงานใหม่")
YEAR = re.compile(r'(25\d\d)')
TH_MONTH = {skel(m): i + 1 for i, m in enumerate(
    "มกราคม กุมภาพันธ์ มีนาคม เมษายน พฤษภาคม มิถุนายน กรกฎาคม สิงหาคม กันยายน ตุลาคม พฤศจิกายน ธันวาคม".split())}
# A "cell" token is not always one value: the 2024 issues draw several columns
# in a single text operator, so "1,179        11,222" arrives whole, and a
# region row can arrive as its entire numeric line at once. Any token made only
# of digits, separators and dashes is therefore scanned for every value it holds.
NUMCELL = re.compile(r'^[\s\d,.\-]+$')
NUMPART = re.compile(r'\d[\d,]*|-')
YTOL = 2.5

def page_rows(page):
    toks = []
    def visit(text, cm, tm, font, size):
        t = text.strip()
        if t:
            toks.append((tm[4], tm[5], t))
    try:
        page.extract_text(visitor_text=visit)
    except Exception:
        return []
    if not toks:
        return []
    rows, cur, last = [], [], None
    for x, y, t in sorted(toks, key=lambda k: (-k[1], k[0])):
        if last is None or abs(y - last) <= YTOL:
            cur.append((x, y, t))
        else:
            rows.append(sorted(cur, key=lambda k: k[0]))
            cur = [(x, y, t)]
        last = y if last is None else last if abs(y - last) <= YTOL else y
    if cur:
        rows.append(sorted(cur, key=lambda k: k[0]))
    return rows

def split_row(row):
    """Label and the row's values, in column order. A token may carry several
    values; one carrying none at all is part of the label."""
    label, vals = [], []
    for _, _, t in row:
        if NUMCELL.match(t):
            for m in NUMPART.finditer(t):
                g = m.group(0)
                vals.append(None if g == "-" else int(g.replace(",", "")))
        else:
            label.append(t)
    return " ".join(label), vals

def groups_of(vals):
    """Employers, then consecutive (total, male, female) triples. Returns the
    per-group totals, or None if the row does not have that shape."""
    body = vals[1:]
    if len(body) < 6 or len(body) % 3:
        return None
    tot = []
    for i in range(0, len(body), 3):
        t, m, f = body[i], body[i + 1], body[i + 2]
        if t is None and m is None and f is None:
            tot.append(0); continue
        t = t or 0; m = m or 0; f = f or 0
        if t != m + f:
            return None
        tot.append(t)
    if len(tot) < 2 or tot[0] != sum(tot[1:]):
        return None
    return tot

def nat_order(header_rows):
    """Relative order of the nationality columns, read off the header band. The
    labels are often drawn as one merged string, so first appearance in reading
    order is what identifies them -- not their x."""
    text = ""
    for row in header_rows:
        text += " " + " ".join(t for _, _, t in row)
    sk = skel(text)
    seen = [(sk.find(v), k) for k, v in NAT_SKEL.items() if sk.find(v) >= 0]
    return [k for _, k in sorted(seen)]

def group_counts(pages_rows):
    """How many (total, male, female) triples the rows of this table carry."""
    from collections import Counter
    c = Counter()
    for row in pages_rows:
        _, vals = split_row(row)
        if len(vals) < 7:
            continue
        tot = groups_of(vals)
        if tot:
            c[len(tot)] += 1
    return c

def read_table(pages_rows, order):
    rows, control, rejected = {}, None, 0
    for row in pages_rows:
        label, vals = split_row(row)
        if len(vals) < 7:
            continue
        tot = groups_of(vals)
        if tot is None:
            rejected += 1
            continue
        nats = tot[1:]
        if len(nats) > len(order):
            rejected += 1
            continue
        d = dict(zip(order, nats))      # a shorter table uses the leading columns
        s = skel(label)
        if NATIONWIDE in s:
            if control is None:
                control = d
            continue
        code = BY_SKEL.get(s)
        if code and code not in rows:
            rows[code] = d
    return rows, control, rejected

def has_province_row(rows):
    for row in rows:
        label, vals = split_row(row)
        if len(vals) >= 7 and skel(label) in BY_SKEL:
            return True
    return False

def parse_pdf(path):
    from pypdf import PdfReader
    try:
        pages = PdfReader(path).pages
    except Exception:
        return None
    # Every province table in these reports prints the nationality groups in the
    # same order, but only some pages render all four labels legibly. Take the
    # order document-wide from the fullest header seen, and truncate it per table
    # to however many groups that table actually has. The reconciliation against
    # the national by-nationality totals is what proves it right.
    tables, cur, asof = [], None, None
    for p in pages:
        rows = page_rows(p)
        if not rows:
            continue
        head = skel(" ".join(t for row in rows[:4] for _, _, t in row))
        starts = BY_PROVINCE in head and NAT_WORD in head and TOC not in head
        if starts:
            if cur:
                tables.append(cur)
            cur = {"skip": NEW_PERMITS in head, "rows": [], "orders": []}
            if asof is None:
                y = YEAR.search(head)
                if y:
                    for name, num in TH_MONTH.items():
                        if name in head:
                            asof = f"{int(y.group(1)) - 543}-{num:02d}"
                            break
        if cur is None:
            continue
        if not starts and not has_province_row(rows):
            tables.append(cur)
            cur = None
            continue
        o = nat_order(rows[:8])
        if o:
            cur["orders"].append(o)
        cur["rows"].extend(rows)
    if cur:
        tables.append(cur)

    # Column identity is settled in two passes. First, learn the CLMV column
    # order from tables that both carry 3-4 nationality columns AND have a header
    # naming exactly that many -- ASEAN tables (nine columns) can never qualify,
    # so they cannot pollute it. Then read every CLMV table, falling back to the
    # learned order where a header was unreadable. Reconciliation against the
    # national by-nationality totals is the final check on all of it.
    shaped = []
    for t in tables:
        if t["skip"]:
            continue
        counts = group_counts(t["rows"])
        if not counts:
            continue
        ngroups = counts.most_common(1)[0][0]
        nnat = ngroups - 1
        if not 2 <= nnat <= 4:
            continue
        shaped.append((t, ngroups, nnat))

    learned = []
    for t, ngroups, nnat in shaped:
        o = next((o for o in t["orders"] if len(o) == nnat), None)
        if o and len(o) > len(learned):
            learned = o
    if len(learned) < 3:
        return None

    total, control, rejected, kept, orders, controls_found = {}, {}, 0, [], [], 0
    for t, ngroups, nnat in shaped:
        order = next((o for o in t["orders"] if len(o) == nnat), None) or learned[:nnat]
        if len(order) != nnat:
            continue
        keep = []
        for r in t["rows"]:
            _, vals = split_row(r)
            if len(vals) < 7:
                continue
            tot = groups_of(vals)
            if tot and len(tot) == ngroups:
                keep.append(r)
        rows, ctrl, rej = read_table(keep, order)
        if not rows:
            continue
        orders.append(order)
        rejected += rej
        kept.append({"n": len(rows), "order": "/".join(order)})
        for code, d in rows.items():
            tgt = total.setdefault(code, {})
            for n, v in d.items():
                tgt[n] = tgt.get(n, 0) + v
        if ctrl:
            controls_found += 1
            for n, v in ctrl.items():
                control[n] = control.get(n, 0) + v
    if not total:
        return None
    summed = {n: sum(v.get(n, 0) for v in total.values()) for n in
              sorted({k for v in total.values() for k in v})}
    return {"provinces": total, "control": control, "controls_found": controls_found,
            "tables_used": len(kept), "summed": summed,
            "tables": kept, "rejected": rejected, "as_of_month": asof,
            "coverage": len(total),
            "order": (max(orders, key=len) if orders else []),
            "orders": ["/".join(o) for o in orders]}

def job(item):
    """Parse every candidate file for the month and keep the fullest result --
    a month can publish the same report more than once, and picking by file size
    made the outcome depend on which copy happened to be bigger."""
    month, ids = item
    best = None
    for pid in sorted(ids):
        path = f"{CACHE}/{pid}.pdf"
        if not os.path.exists(path) or os.path.getsize(path) < 400000:
            continue
        rec = parse_pdf(path)
        if not rec:
            continue
        rec["source_id"] = pid
        key = (rec["coverage"], rec["tables_used"], rec["controls_found"])
        if best is None or key > best[0]:
            best = (key, rec)
    return month, (best[1] if best else None)

def main():
    idx = json.load(open(f"{ROOT}/data/raw/doe_file_index.json"))
    lo = sys.argv[1] if len(sys.argv) > 1 else "2016-01"
    hi = sys.argv[2] if len(sys.argv) > 2 else "2099-12"
    todo = sorted((m, v) for m, v in idx.items() if lo <= m <= hi)
    out = {}
    with ProcessPoolExecutor(max_workers=3) as ex:
        for month, rec in ex.map(job, todo):
            if not rec:
                print(f" MISS {month}", flush=True); continue
            out[month] = rec
            s = rec["summed"]
            print(f"  ok  {month}  prov={rec['coverage']:2}  "
                  + " ".join(f"{n}={s.get(n, 0):>9,}" for n in ("MM", "KH", "LA", "VN"))
                  + f"  tbl={rec['tables_used']}  ctrl={rec['controls_found']}"
                  + f"  rej={rec['rejected']:3}  src={rec['source_id']}", flush=True)
    json.dump({"meta": {"source": "Department of Employment (Thailand), monthly report",
                        "tables": "section 59 MOU, section 64, section 63/2 (both cabinet-resolution groups), by province and nationality",
                        "note": "province total is the sum of those stock tables; rows failing the total identities are dropped"},
               "months": out}, open(f"{ROOT}/data/raw/doe_province_raw.json", "w"), indent=1)
    print(f"\nparsed {len(out)}/{len(todo)}")

if __name__ == "__main__":
    main()
