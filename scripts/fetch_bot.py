#!/usr/bin/env python3
"""Pull quarterly Personal transfers (Secondary income, payments AND receipts)
from BOT table EC_XT_048 -- Balance of Payments, millions of baht.

The page is ASP.NET WebForms: GET once to harvest __VIEWSTATE, then POST the
period range back. Everything we need is in the rendered HTML grid, so no
JS execution and no API key."""
import re, html, json, sys, os, urllib.request, urllib.parse, gzip

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://app.bot.or.th/BTWS_STAT/statistics/BOTWEBSTAT.aspx?reportID=645&language=ENG"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"

def get(url, data=None, cookie=None):
    req = urllib.request.Request(url, data=data, headers={
        "User-Agent": UA, "Accept": "text/html,*/*",
        "Accept-Encoding": "gzip", "Referer": URL,
        **({"Content-Type": "application/x-www-form-urlencoded"} if data else {}),
        **({"Cookie": cookie} if cookie else {})})
    r = urllib.request.urlopen(req, timeout=90)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        raw = gzip.decompress(raw)
    ck = "; ".join(v.split(";")[0] for k, v in r.getheaders() if k.lower() == "set-cookie")
    return raw.decode("utf-8", "replace"), (ck or cookie)

def hidden(s):
    return {m.group(1): html.unescape(m.group(2))
            for m in re.finditer(r'<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"', s)}

def cells(row):
    return [html.unescape(re.sub(r'<[^>]+>', '', c)).replace('\xa0', ' ').strip()
            for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', row, re.S)]

def grid(s):
    i = s.find('<table class="Grid"')
    if i < 0: return None, []
    t = s[i:s.find('</table>', i)]
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.S)
    return cells(rows[0]), [cells(r) for r in rows[1:]]

def main(from_year=2005, to_year=2025):
    s, ck = get(URL)
    f = hidden(s)
    f.update({"drpPeriod": "QTR",
              "drpFromYear": f"{from_year}xxxx", "drpFromQuarter": "xxxx03xx",
              "drpToYear": f"{to_year}xxxx", "drpToQuarter": "xxxx12xx",
              "btnSubmit": "Submit"})
    s2, _ = get(URL, urllib.parse.urlencode(f).encode(), ck)
    hdr, rows = grid(s2)
    if not hdr:
        sys.stderr.write("no grid -- postback rejected\n")
        open(f"{ROOT}/data/raw/bot_post_debug.html", "w").write(s2)
        return 1

    periods = [h for h in hdr[2:] if h.strip()]
    upd = re.search(r'Last Updated\s*:\s*([^<]+)', s2)
    unit = re.search(r'id="lblUOQ"[^>]*>\(?([^<)]+)', s2)

    # Rows 55 and 60 are both labelled "2.1 Personal transfers" -- one under
    # receipts, one under payments -- so track the heading we last passed.
    out = {"receipts": {}, "payments": {}}
    side = None
    for c in rows:
        if len(c) < 3: continue
        lbl = c[1].strip()
        if lbl == "Secondary Income receipts": side = "receipts"; continue
        if lbl == "Secondary Income payments": side = "payments"; continue
        if side and lbl.startswith("2.1 Personal transfers"):
            for p, v in zip(periods, c[2:]):
                v = v.replace(",", "").strip()
                if v in ("", "-", "n.a.", "..."): continue
                try: out[side][p.replace(" p", "").strip()] = float(v)
                except ValueError: pass
            side = None

    meta = {"table": "EC_XT_048", "title": "Balance of Payments (BOT)",
            "unit": (unit.group(1).strip() if unit else "Millions of Baht"),
            "last_updated": (upd.group(1).strip() if upd else None),
            "provisional": [p.replace(" p", "").strip() for p in periods if p.endswith("p")],
            "url": URL}
    json.dump({"meta": meta, "personal_transfers": out},
              open(f"{ROOT}/data/raw/bot_personal_transfers.json", "w"), indent=1)
    print(f"columns={len(periods)}  newest={periods[0]}  oldest={periods[-1]}")
    print(f"payments n={len(out['payments'])}  receipts n={len(out['receipts'])}")
    print("updated:", meta["last_updated"], "| unit:", meta["unit"])
    return 0

if __name__ == "__main__":
    sys.exit(main())
