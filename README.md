# Mekong Remittance Corridors

Live: https://minsungkim-source.github.io/MekongRemittance/

Millions of people from Myanmar, Cambodia, Laos and Viet Nam work in Thailand and
send money home. This is a single self-contained HTML page that follows that money,
built from two public records: the Bank of Thailand's quarterly total for money
individuals send abroad (the balance-of-payments line migrant remittances sit in),
and the Thai labour ministry's monthly count of foreign work permits, province by
province.

How much leaves Thailand, and when in the year, is measured. How much goes to each
country is an estimate — and every figure says which of the two it is.

Built to the plan in this repo's history, with one substantive change forced by the
data: **monthly corridor seasonality is not obtainable from public sources**, so the
page is quarterly and says why.

## What is measured and what is not

| Layer | Grade | Source |
|---|---|---|
| Thailand's outward personal transfers, quarterly 2009Q1–2025Q4 | **A** measured | BOT `EC_XT_048`, secondary income → payments → 2.1 Personal transfers |
| Seasonal index of that series | **A** measured | ratio to centred 4-quarter average |
| Work-permit stock by nationality, 108 months | **A** measured | Thai Department of Employment monthly report PDFs |
| Receiving-country remittance inflows, GDP, FX | **A** measured | World Bank WDI |
| Work-permit stock by **province** and nationality, 16 months | **A** measured | same reports, province tables (77/77 provinces, 99–100% of the national count for MM/LA/KH) |
| Corridor split of the Thai outflow | **B** modelled | pool assumption × work-permit share × per-worker factor |

Both modelling constants are stated on the page rather than buried. Neither can be
measured from the sources:

- **Pool share (0.70).** The balance of payments has no country breakdown. Two
  things pull the true value in opposite directions — these four nationalities are
  ~9 in 10 of all work-permit holders, but they earn far less per head than the
  remaining tenth, and the 2024 World Bank/ILO survey of 1,770 CLM workers found
  **under 15% remit by bank transfer** (10% among Lao workers), so much of what
  they send never reaches the balance of payments at all. 0.70 is a round number
  between those pulls, and the slider shows how much the answer depends on it.
- **Per-worker factor (1.00 for all four).** Left neutral because no current
  survey publishes a per-nationality amount: the 2024 survey shows it only as a
  chart (Figure 3.8b), and the one source that prints it as text is the ILO's
  **2010** synthesis — a median of ~30,000 baht over two years for Myanmar against
  ~20,000 for Cambodia — which that same 2024 survey says has since reordered.
| Corridor prices | — not obtained | RPW is behind a bot challenge; the World Bank API's RPW tables stop at 2020-12 |
| Origin-country monthly receipts | — not found | no open monthly series located for NBC / BOL / CBM |

Three findings that shaped the build:

1. **The monthly balance-of-payments table cannot support a monthly series.**
   `EC_XT_046_S2` reports services, primary income and secondary income as one
   combined line. Personal transfers are separated only in the quarterly table.
2. **The pre-2009 zeros are placeholders, not zeros.** BOT prints `0.00` for the
   payments line for 16 quarters before 2009Q1. Left in, they invent a series start
   and drag the seasonal factors toward zero, so the axis starts at 2009Q1.
3. **The province tables need positioned glyphs, and a cell is not a token.**
   Flattened text fuses a value that overflows its cell with its neighbour
   (`11,0982,373`). Reading the PDF's glyph coordinates fixes that, but a second
   problem remains: the 2024 issues draw several columns in a single text
   operator, so `"1,179        11,222"` arrives whole and a region row can arrive
   as its entire numeric line at once. Every token made only of digits,
   separators and dashes is therefore scanned for *all* the values it holds. Two
   identities then prove each row landed correctly — `total = male + female` per
   triple, and `grand total = Σ nationalities`.

   The column *identity* is settled in two passes, because only some pages render
   all four nationality labels legibly: learn the order from tables that carry
   3–4 nationality columns and whose header names exactly that many (the 2024
   ASEAN tables carry nine, so they can never qualify), then fall back to the
   learned order where a header is unreadable. Cambodia's share by province comes
   out highest in Trat, Surin, Sa Kaeo and Chanthaburi — every one a Cambodian
   border province — which is the check that the columns are the right way round.
4. **Two readings of the same reports are made to agree, or neither is used.**
   The national count by nationality and the province tables come from the same
   monthly PDFs but from different tables, read by different code. The build
   compares them and withholds any month where they diverge by more than 20%.
   This caught a real error: in the 2023 layout the national cross-tab lists a
   nationality in *both* panels with different permit categories in each, and
   the reader captured only one of the two — Laos came out at 92,542 when the
   province tables (identity-checked, and in agreement with the national figure
   in every other run) say 215,110. The MOU column of 122,809 was sitting on the
   same page, on a row the panel split cut through. 2023Q2–Q4 now publish a
   national flow with no corridor split, instead of a corridor split that was
   wrong by threefold on Laos.

5. **The work-permit count is not a migration series.** Its level steps whenever a
   cabinet resolution opens a registration window or the report changes which
   columns it prints, and its unit switched from *positions* to *persons* partway
   through. The pipeline cuts it into runs at every such step and never joins them.
   From May 2025 the table stops carrying ~1.8m in-process renewals, almost all
   Myanmar nationals, so shares from that run understate Myanmar.

## Pipeline

```bash
python3 scripts/fetch_bot.py      # BOT quarterly personal transfers (ASP.NET postback)
python3 scripts/parse_doe.py      # DOE monthly PDFs -> stock by nationality
python3 scripts/parse_doe_prov.py # DOE province tables -> stock by province x nationality
                                  # (parses every candidate PDF per month, keeps the fullest)
python3 scripts/build.py          # normalise, segment into runs, seasonal factors
python3 scripts/render.py         # template + dataset + app -> index.html
```

`fetch_doe.py` is the earlier summary-board reader, kept because it cross-checks
`parse_doe.py` for the months where the board is text rather than an image.

World Bank pulls are plain REST and are cached in `data/raw/wb_*.json`:

```bash
curl -s "https://api.worldbank.org/v2/country/THA/indicator/BM.TRF.PWKR.CD.DT?format=json&per_page=80" -o data/raw/wb_tha_paid.json
```

Requires `pypdf` (`python3 -m pip install --user pypdf`). No other dependencies.

### Layout

```
scripts/    fetch, parse, build, render, local preview server
src/        template.html (chrome + CSS) and app.js (model + rendering)
data/raw/   fetched sources, including ~350MB of cached DOE PDFs
data/build/ dataset.json, the only thing the page embeds
index.html  the published page, self-contained apart from Google Fonts
```

The page makes no network calls at runtime. The corridor model runs in the browser
so the assumption sliders can move it, and state is serialised into the URL hash so
a particular view can be sent to someone.

### Local preview

```bash
python3 scripts/serve.py
```

## Known gaps

- The map covers 16 months, 15 of them consecutive (2024-01 → 2025-03, run R5),
  which is what the within-run change metric uses. 14 further months were parsed
  and rejected: 2023 because the *national* Laos figure looks understated
  (province sums come to 230–310% of it, so the two do not agree and which one is
  wrong is not cheaply resolvable); 2025-05…09 because the section 63/2 renewal
  table is short on Cambodia; 2025-04 and 2025-11 because the national count
  includes in-process renewals that the province tables do not. Every rejection
  and its reason is printed by the build and echoed on the page.
- Viet Nam reconciles at only 63–77% — it is a few thousand people and is absent
  from one of the four tables, so the gate does not test nationalities below
  50,000. Its province figures are shown but should not be leaned on.
- The 2023 national by-nationality figures are known to be wrong and are not
  used; fixing them needs the national cross-tab rewritten on positioned glyphs
  the way `parse_doe_prov.py` already is. Until then the gate keeps them out.
- 11 of 119 months in 2016–2025 do not parse for the national series; they are
  recorded as missing, never interpolated.
- Province boundaries and the province code/name table are reused from
  https://minsungkim-source.github.io/LoanTHhitmap/ (originally NSO ArcGIS,
  simplified). No household statistics were carried over from it.
- The pool share and per-worker factors are assumptions with no public source. They
  are exposed as sliders rather than buried as constants.
