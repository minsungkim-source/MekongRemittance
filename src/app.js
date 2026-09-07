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
   English is the default; a Thai or Korean browser starts in its own
   language. Every visible string lives in this table.                 */
const I18N = {
en: {
  htmlLang: 'en',
  stamp: 'data',
  h1: 'Thailand pays out. Where does it land, and when?',
  dek: 'Millions of people from Myanmar, Cambodia, Laos and Viet Nam work in Thailand and send money home. This page follows that money using two public records: the Bank of Thailand’s quarterly total for money individuals send abroad, and the labour ministry’s monthly count of foreign work permits, province by province. <b>How much leaves Thailand, and when in the year, is measured.</b> How much goes to each country is an <b>estimate</b> — and every number here says which of the two it is.',
  fCorridor: 'corridor', fMetric: 'metric', fGrade: 'evidence', fLang: 'language',
  fAssume: 'Assumptions behind the corridor split',
  all: 'Thailand, all destinations',
  mSi: 'Seasonal index', mLevel: 'Flow per quarter', mShare: 'Corridor share',
  mWorker: 'Per worker, per month', mYoy: 'Year on year',
  gAll: 'Show modelled', gMeasured: 'Measured only',
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
  legFell: 'fell', legRose: 'rose',
  mWorkersProv: 'Work permits', mShareProv: 'Share of the province',
  mapHint: (n, m, cov, rej, pub) => `Work-permit holders by province, ${m}. ${n} of 77 provinces carry a figure. These tables cover four of the permit categories, not all of them, so the province sum reaches ${cov} of the national count by nationality — the remainder sits in categories the report does not break down by province. ${pub} month${pub === 1 ? '' : 's'} reconcile closely enough to publish and ${rej} were rejected; the reasons are in the source table above. The slider moves inside that set, and change is only ever measured against the first month of the same run.`,
  medianRow: 'median',
  none: '—', noRun: 'no usable run',
},
th: {
  htmlLang: 'th',
  stamp: 'ข้อมูล',
  h1: 'เงินออกจากไทย ไปที่ใด และเมื่อไร',
  dek: 'คนหลายล้านคนจากเมียนมา กัมพูชา ลาว และเวียดนาม ทำงานในประเทศไทยและส่งเงินกลับบ้าน หน้านี้ติดตามเงินก้อนนั้นด้วยข้อมูลสาธารณะสองชุด คือ ยอดเงินที่บุคคลส่งออกนอกประเทศรายไตรมาสของธนาคารแห่งประเทศไทย และจำนวนใบอนุญาตทำงานของคนต่างด้าวรายเดือนแยกรายจังหวัดของกระทรวงแรงงาน <b>ยอดที่ออกจากไทยและช่วงเวลาในรอบปี เป็นค่าที่วัดได้</b> ส่วนการแบ่งว่าไปประเทศใดเท่าไร เป็น <b>ค่าประมาณ</b> และทุกตัวเลขในหน้านี้ระบุว่าตนเป็นอย่างไหน',
  fCorridor: 'เส้นทาง', fMetric: 'ตัวชี้วัด',
  fGrade: 'ชั้นของข้อมูล', fLang: 'ภาษา',
  fAssume: 'ข้อสมมติของการแยกเส้นทาง',
  all: 'ไทย ทุกปลายทาง',
  mSi: 'ดัชนีตามฤดูกาล', mLevel: 'มีลค่าต่อไตรมาส',
  mShare: 'สัดส่วนเส้นทาง', mWorker: 'ต่อคนต่อเดือน',
  mYoy: 'เทียบปีก่อน',
  gAll: 'แสดงค่าจำลอง', gMeasured: 'เซพาะค่าที่วัดได้',
  roOver: 'อยู่บน', roSheet: 'แผ่นเขียนแบบ', roSheetLabel: 'แผ่น',
  roQuarter: 'ไตรมาส', roProvince: 'จังหวัด', roCorridor: 'เส้นทาง',
  roWithheld: '· ระงับไว้',
  hiddenModelled: 'ซ่อนอยู่ ทุกตัวเลขในแผงนี้เป็นค่าจำลอง มุมมองนี้แสดงเฉพาะสิ่งที่แหล่งข้อมูลระบุโดยตรง',
  boardSi: 'ดัชนีตามฤดูกาลรายไตรมาส',
  boardLevel: 'มีลค่ารายไตรมาส',
  boardShare: 'สัดส่วนเส้นทางรายไตรมาส',
  boardWorker: 'ต่อคนต่อเดือน',
  boardYoy: 'การเปลี่ยนแปลงเทียบปีก่อน',
  chartTitle: 'เงินโอนส่วนบุคคลจ่ายออกต่างประเทศ รายไตรมาส',
  flowTitle: 'เงินไปที่ไหน',
  rankTitle: 'อันดับเส้นทาง',
  ctxTitle: 'ตัวเลขที่ประเทศปลายทางรายงาน',
  tblTitle: 'ทุกไตรมาส',
  tblHint: 'กดหัวคอลัมน์เพื่อเรียง',
  yearCol: 'ปี', totalCol: 'ปี',
  legLo: 'ต่ำกว่าแนวโน้ม',
  legMid: 'สีคือระยะห่างจากแนวโน้ม 4 ไตรมาส',
  legHi: 'สูงกว่าแนวโน้ม',
  legLoSeq: 'น้อย', legMidSeq: 'สีคือขนาดในชุดนี้', legHiSeq: 'มาก',
  selected: 'ไตรมาสที่เลือก',
  emptyDetail: 'เลือกไตรมาสจากตารางเพื่อดูตัวเลขเบื้องหลัง',
  measuredBanner: 'เปิดโหมดเซพาะค่าที่วัดได้ ค่าแยกเส้นทางเป็นค่าจำลองจึงถูกซ่อนไว้',
  corridorBanner: q => `ค่าเส้นทางมีเพียงช่วงที่ตารางใบอนุญาตใช้งานต่อเนื่องกันเท่านั้น: ${q}`,
  windowNote: '○ หน้าต่างเดียว — ใช้ค่าเป็นสี่ไตรมาสหลังสุด',
  provNote: '· ตัวเลขเบื้องต้น',
  gradeA: 'วัดได้', gradeB: 'จำลอง',
  poolLabel: 'สัดส่วนเงินออกจากไทยที่ไป 4 ประเทศนี้',
  propLabel: c => `${c} — ส่งต่อคน เทียบค่าเปลี่ย`,
  assumeHint: 'การแยกเส้นทางนำยอดรวมที่วัดได้มาคูณสัดส่วนที่สมมติว่าไป 4 ประเทศนี้ แล้วหารตามสัดส่วนแรงงานแต่ละสัญชาติ คูณด้วยตัวคูณต่อคน ทั้งสองค่าเป็นข้อสมมติ ไม่ใช่ข้อค้นพบ <b>สัดส่วนที่ไป 4 ประเทศนี้สังเกตไม่ได้</b> เพราะดุลการชำระเงินไม่แยกรายประเทศ สี่สัญชาตินี้คิดเป็นราว 9 ใน 10 ของผู้ถือใบอนุญาต แต่มีรายได้ต่อคนต่ำกว่ามาก และผลสำรวจธนาคารโลก/ILO ปี 2567 จากแรงงาน 1,770 คน พบว่าไม่ถึง 15% ส่งเงินผ่านธนาคาร (ลาว 10%) เงินส่วนใหญ่จึงไม่ปรากฏในดุลการชำระเงิน ค่า 0.70 เป็นตัวเลขกลม ไม่ใช่ค่าที่วัดได้ <b>ตัวคูณต่อคนตั้งเป็นกลาง</b> เพราะไม่มีผลสำรวจปัจจุบันที่เผยแพร่ตัวเลขรายสัญชาติเป็นข้อความ',
  boardHintSi: 'ดัชนีคือค่าไตรมาสหารด้วยค่าเฉลี่ยเคลื่อนที่ 4 ไตรมาสรอบไตรมาสนั้น 1.00 คือตรงแนวโน้ม ทั้งอนุกรมพบว่าไตรมาสที่ 1 สูงสุด ไตรมาสที่ 3 ต่ำสุด — ตรงกันข้ามกับข้อสันนิษฐานเรื่องสงกรานต์ การอ่านรายปีต้องระวัง เพราะวิธีนี้ตัดระดับออกแต่ไม่ตัดการเร่งตัวของการเติบโต ไตรมาสที่ยังไม่มีไตรมาสถัดไปจะเว้นว่างไว้',
  boardHintOther: 'สีไล่จากค่าน้อยสุดถึงมากสุดในชุดที่แสดง ค่าที่แน่นอนอยู่ในตารางด้านล่าง',
  identityNote: 'เมื่อตัวคูณต่อคนเท่ากันทุกเส้นทาง ค่าต่อคนจะเท่ากันทั้งหมดโดยโครงสร้างการคำนวณ ไม่ใช่ข้อค้นพบ',
  workerHint: 'ค่านี้คือค่าจำลองของเส้นทางหารด้วยจำนวนแรงงาน เมื่อตัวคูณเท่ากันผลจะเท่ากันทุกเส้นทางโดยโครงสร้าง',
  chartHint: n => `อนุกรมที่วัดได้ ${n} ไตรมาส เส้นประคือเส้นทางที่เลือกตามข้อสมมติ`,
  flowHint: 'ไตรมาสล่าสุดที่มีข้อมูลแรงงานใช้งานได้',
  rankHint: 'ผลรวมค่าจำลองในช่วงข้อมูลแรงงานล่าสุดที่ใช้ได้',
  ctxHint: 'เป็นเงินที่แต่ละประเทศรายงานว่ารับจากทั้งโลก ไม่ใช่จากไทยเท่านั้น',
  cols: ['ไตรมาส', 'จ่ายออก', 'ดัชนีฤดูกาล', 'แรงงาน', 'สัดส่วน', 'ค่าจำลอง', 'ต่อคน'],
  unitMB: 'ล้านบาท', unitBn: 'พันล้านบาท',
  workers: 'คน', regime: 'ช่วง',
  dPaid: 'จ่ายออกทุกปลายทาง', dSi: 'ดัชนีฤดูกาล',
  dShare: 'สัดส่วนใน 4 ประเทศ', dFlow: 'ค่าเส้นทางจำลอง',
  dWorkers: 'ใบอนุญาตคงเหลือ', dWorker: 'ต่อคนต่อเดือน',
  dYoy: 'เทียบปีก่อน', dRegime: 'ช่วงข้อมูล',
  ab: ['หน้านี้คืออะไร', 'การแยกเส้นทางทำอย่างไร', 'แหล่งข้อมูล และสิ่งที่ไม่ได้มา', 'ข้อควรระวังในการอ่าน'],
  festTh: 'สงกรานต์', festQ2: 'ปีใหม่',
  festPchum: 'ปจุมเบิน', festTet: 'เติ๊ต',
  festThad: 'ออกพรรษา (เมียนมา)', festLao: 'ธาตหลวง',
  fPeak: 'ไตรมาสที่สูงสุด', fTrough: 'ต่ำสุด', fLargest: 'เส้นทางใหญ่สุด',
  fSince2016: 'ไตรมาสสูงสุด ตั้งแต่ 2559', fQuarters: 'ไตรมาสที่วัดได้',
  mapTitle: 'เงินออกจากจังหวัดใด',
  mChangeProv: 'เปลี่ยนแปลงในช่วง', monthLabel: 'เดือน', monthsWord: n => `${n} เดือน`,
  legFell: 'ลดลง', legRose: 'เพิ่มขึ้น',
  mWorkersProv: 'ใบอนุญาตทำงาน', mShareProv: 'สัดส่วนในจังหวัด',
  mapHint: (n, m, cov, rej, pub) => `จำนวนผู้ถือใบอนุญาตทำงานรายจังหวัด ${m} มีข้อมูล ${n} จาก 77 จังหวัด ตารางเหล่านี้ครอบคลุมสี่ประเภทใบอนุญาต ไม่ใช่ทั้งหมด ผลรวมรายจังหวัดจึงเท่ากับ ${cov} ของยอดรวมระดับชาติ แสดง ${pub} เดือน และตัดออก ${rej} เดือน การเปรียบเทียบทำเฉพาะภายในช่วงข้อมูลเดียวกัน`,
  medianRow: 'มัธยฐาน',
  none: '—', noRun: 'ไม่มีช่วงที่ใช้ได้',
},
ko: {
  htmlLang: 'ko',
  stamp: '데이터',
  h1: '태국에서 나가는 돈은 어디로, 언제 가는가',
  dek: '미얀마·캄보디아·라오스·베트남에서 온 수백만 명이 태국에서 일하며 고향으로 돈을 보낸다. 이 페이지는 공개 자료 두 가지로 그 돈을 따라간다 — 개인이 국외로 보낸 금액을 집계한 태국중앙은행 분기 통계, 그리고 노동부가 매달 주(州)별로 세는 외국인 노동허가 수. <b>태국에서 얼마가 나가는지, 한 해 중 언제 나가는지는 실측이다.</b> 그중 어느 나라로 얼마가 가는지는 <b>추정</b>이고, 이 페이지의 모든 숫자는 자기가 둘 중 어느 쪽인지 밝힌다.',
  fCorridor: '코리도', fMetric: '지표', fGrade: '근거', fLang: '언어',
  fAssume: '코리도 배분에 쓰인 가정',
  all: '태국 전체',
  mSi: '계절지수', mLevel: '분기 규모', mShare: '코리도 점유율',
  mWorker: '1인당 월 송금', mYoy: '전년 대비',
  gAll: '모형치 표시', gMeasured: '실측만',
  roOver: '위치', roSheet: '제도 용지', roSheetLabel: '시트',
  roQuarter: '분기', roProvince: '주', roCorridor: '코리도',
  roWithheld: '· 보류됨',
  hiddenModelled: '숨김. 이 패널의 모든 수치는 모형치이고, 이 보기는 출처가 직접 밝힌 것만 보여준다.',
  boardSi: '분기별 계절지수', boardLevel: '분기별 규모', boardShare: '분기별 코리도 점유율',
  boardWorker: '1인당 월 송금', boardYoy: '전년 대비 증감',
  chartTitle: '대외 개인이전 지급, 분기',
  flowTitle: '어디로 가는가', rankTitle: '코리도 순위 (모형치)',
  ctxTitle: '수취국이 보고하는 값',
  tblTitle: '전체 분기', tblHint: '열 제목을 눌러 정렬',
  yearCol: '연도', totalCol: '연도',
  legLo: '추세 이하', legMid: '색은 4분기 추세와의 거리', legHi: '추세 이상',
  legLoSeq: '작음', legMidSeq: '색은 계열 내 크기', legHiSeq: '큼',
  selected: '선택한 분기',
  emptyDetail: '격자에서 분기를 선택하면 그 셀을 만든 수치를 볼 수 있다.',
  measuredBanner: '실측만 보기가 켜져 있다. 코리도 배분은 모형이므로 숨겼다 — 남은 것이 공개 통계가 직접 말하는 전부다.',
  corridorBanner: q => `코리도 수치는 노동허가 통계에 연속 구간이 있는 곳에만 존재한다: ${q}. 나머지는 의도적으로 비워 두었다.`,
  windowNote: '○ 편측 구간 — 이후 분기가 아직 없어 직전 4분기를 추세로 사용',
  provNote: '· 원자료 잠정치',
  gradeA: '실측', gradeB: '모형',
  poolLabel: '태국 유출액 중 이 4개국으로 가는 비중',
  propLabel: c => `${c} — 1인당 송금액, 평균 대비`,
  assumeHint: '코리도 배분은 실측 전국 유출액에 이 4개국으로 간다고 가정한 비중을 곱하고, 그것을 국적별 노동허가 인구 비중으로 나눈 뒤 1인당 계수를 곱한 것이다. 둘 다 발견이 아니라 가정이다. <b>풀 비중은 관측할 수 없다</b> — 국제수지에 국가별 분해가 없다 — 그리고 서로 반대 방향의 힘이 둘 있다. 이 4개 국적은 전체 노동허가 보유자의 약 10분의 9지만 1인당 소득은 나머지 10분의 1보다 훨씬 낮고, 2024년 World Bank/ILO의 1,770명 서베이는 그중 <b>15% 미만만 은행 송금</b>을 쓴다고(라오스는 10%) 보고한다. 즉 이들이 보내는 돈의 상당 부분은 애초에 국제수지에 잡히지 않는다. 0.70은 그 두 힘 사이의 둥근 수치이지 측정값이 아니다. <b>1인당 계수는 중립으로 둔다.</b> 국적별 금액을 본문으로 공표한 최신 서베이가 없기 때문이다 — 2024년 서베이는 차트로만 싣고, 본문으로 싣는 유일한 자료는 2010년 ILO 보고서(2년간 중위 미얀마 약 30,000바트 대 캄보디아 20,000바트)인데 그 순서조차 2024년 서베이가 이미 바뀌었다고 말한다. 두 값을 움직여 답이 얼마나 거기에 의존하는지 보라.',
  boardHintSi: '지수는 해당 분기를 그 주위 중심 4분기 평균으로 나눈 값이다. 1.00은 그 분기가 자기 국지 추세에 정확히 놓였다는 뜻이다. 전체 계열로 보면 1분기가 가장 강하고 3분기가 가장 약하다 — 송끄란 중심 서사가 예측하는 것과 정반대이며, 격자 맨 아래 중위수 행이 그 요약이다. 단일 연도는 조심해서 읽어야 한다: 이 나눗셈은 수준은 제거하지만 성장률의 변화는 제거하지 못하므로, 2024·2025년 후반부는 계절이 아니라 가속 때문에 위로 밀린다. 후속 분기가 아직 없는 칸은 중심 구간이 존재하지 않으므로 비워 둔다.',
  boardHintOther: '색은 화면에 표시된 계열의 최소값부터 최대값까지다. 정확한 수치는 하단 표에 있다.',
  identityNote: '1인당 계수를 모두 같은 값으로 두는 동안 1인당 수치는 네 코리도가 동일하다 — 발견이 아니라 송금 행태에 차이를 가정하지 않은 데서 나오는 산술적 결과다. 계수를 벌려야 의미가 생긴다.',
  workerHint: '모형 코리도 규모를 해당 코리도의 노동허가 수로 나눈 값이다. 1인당 계수가 같으면 구조상 모든 코리도에서 같은 값이 나오며, 계수를 벌릴 때만 갈라진다.',
  chartHint: n => `실측 계열 ${n}분기. 점선은 현재 가정 하의 선택 코리도.`,
  flowHint: '노동허가 수치가 유효한 가장 최근 분기. 폭은 모형치이므로 슬라이더에 따라 움직인다.',
  rankHint: '노동허가 통계의 가장 최근 유효 구간에 대한 모형 규모 합계.',
  ctxHint: '각국이 전 세계로부터 받았다고 보고하는 송금액이다. 태국발만이 아니다. 모형 코리도값을 독립적인 값과 비교하기 위해 표시한다.',
  cols: ['분기', '대외 지급', '계절지수', '노동자', '점유율', '모형 규모', '1인당'],
  unitMB: '백만밧', unitBn: '십억밧', workers: '명', regime: '구간',
  dPaid: '대외 지급 전체', dSi: '계절지수', dShare: '4개국 내 점유율',
  dFlow: '모형 코리도 규모', dWorkers: '보유 노동허가', dWorker: '1인당 월 송금',
  dYoy: '전년 동기 대비', dRegime: '원자료 구간',
  ab: ['이 페이지는 무엇인가', '코리도 배분은 어떻게 만들었는가', '출처, 그리고 얻지 못한 것', '오독하지 않고 읽는 법'],
  festTh: '송끄란', festQ2: '설', festPchum: '프춤번', festTet: '뗏',
  festThad: '더딘쭈', festLao: '탓루앙',
  fPeak: '가장 강한 분기', fTrough: '가장 약한', fLargest: '최대 코리도',
  fSince2016: '가장 강한 분기, 2016년 이후', fQuarters: '측정 분기',
  mapTitle: '돈이 어디서 나가는가',
  mChangeProv: '구간 내 변화', monthLabel: '월', monthsWord: n => `${n}개월`,
  legFell: '감소', legRose: '증가',
  mWorkersProv: '노동허가', mShareProv: '주 내 점유율',
  mapHint: (n, m, cov, rej, pub) => `주별 노동허가 보유자, ${m}. 77개 주 중 ${n}개에 수치가 있다. 이 표들은 허가 유형 전체가 아니라 네 가지만 담으므로 주별 합계는 국적별 전국 집계의 ${cov} 수준이다 — 나머지는 보고서가 주별로 분해하지 않는 유형에 있다. ${pub}개월이 대조를 통과해 실렸고 ${rej}개월은 기각했다. 이유는 위 출처 표에 있다. 슬라이더는 그 범위 안에서만 움직이며, 변화는 항상 같은 구간의 첫 달과 비교한다.`,
  medianRow: '중위수',
  none: '—', noRun: '유효 구간 없음',
},
};
['th', 'ko'].forEach(l => {                 // fall back to English, never blank
  Object.keys(I18N.en).forEach(k => { if (I18N[l][k] === undefined) I18N[l][k] = I18N.en[k]; });
});
I18N.th.ab1 = I18N.en.ab1; I18N.th.ab2 = I18N.en.ab2; I18N.th.ab4 = I18N.en.ab4;
I18N.ko.ab1 = [
  '태국은 순 송금 유출국이다. 국제수지는 나가는 돈을 <b>개인이전</b>으로 기록한다 — 가계에서 가계로 가는 돈, 즉 미얀마·캄보디아·라오스·베트남 이주노동자의 임금이 고향으로 가는 경로다. 태국은행은 이 항목을 분기로 공표하며, 이 페이지에서 측정되고 전국 단위이며 모호하지 않은 유일한 숫자다.',
  '여기에 고용부의 월간 노동허가 집계 — 국적별, 그리고 지도의 근거가 되는 주별 — 과 4개 수취국이 보고하는 유입액을 붙인다. 이것들로 태국 유출액이 코리도별로 어떻게 갈리는지 추정하고, 그 추정치가 나타나는 모든 곳에 추정임을 표시한다.',
  '<b>할 수 없는 것:</b> 비공식 채널 측정, 코리도 가격 산정, 월별 값 제시. 손으로 들고 가거나 훈디로 움직인 돈은 국제수지에 들어오지 않으므로, 이 페이지의 모든 규모는 <b>공식 채널</b> 값이며 실제보다 적게 잡힌 값이다.'];
I18N.ko.ab2 = [
  '세 단계이며, 실측인 것은 첫 단계뿐이다.',
  '<b>1 — 전국 유출액.</b> 태국은행 2차소득 지급 항목 2.1 개인이전. 분기, 백만밧, 2005년부터. 공표값 그대로 사용.',
  '<b>2 — 풀.</b> 국제수지에 국가별 분해가 없으므로, 그 유출액 중 이 4개국으로 가는 비중은 슬라이더로 설정하는 가정이다. 어떤 공개 출처로도 관측할 수 없다.',
  '<b>3 — 배분.</b> 각 코리도는 풀 × 노동허가 인구 점유율 × 1인당 계수를 받는다. 점유율은 노동허가 통계에서 오고, 계수의 기본값은 1.00 — 송금 행태에 차이를 가정하지 않는다는 뜻이다.',
  '계절지수는 해당 분기를 주위 중심 4분기 평균으로 나눈 값이다. 전국 계열에 적용하면 실측이다. 코리도에 적용하면 모형을 물려받으며, 원자료 표의 한 구간 안에서만 계산한다 — 구간 경계를 넘지 않는다. 경계는 이주의 변화가 아니라 표가 세는 대상의 변화이기 때문이다.'];
I18N.ko.ab4 = [
  '<b>노동허가 집계는 이주 시계열이 아니다.</b> 내각결의로 등록 창구가 열릴 때마다, 또는 보고서가 출력하는 열이 바뀔 때마다 수준이 계단식으로 뛰며, 단위도 중간에 "직위"에서 "명"으로 바뀌었다. 이 페이지는 그런 단절마다 계열을 구간으로 자르고 이어붙이지 않는다. 그 계열의 큰 움직임은 사람이 아니라 정책이다.',
  '<b>가장 최근 구간에서 미얀마는 과소 계상된다.</b> 2025년 5월부터 원자료 표는 진행 중인 갱신 건 — 약 180만 명, 거의 전부 미얀마 국적 — 을 싣지 않는다. 따라서 그 구간의 코리도 점유율은 미얀마를 낮게, 나머지를 높게 잡는다.',
  '<b>계절성이 분기 단위인 것은 선택이 아니라 한계다.</b> 월간 국제수지 표는 서비스·본소득·2차소득을 한 줄로 합산해 발표하므로 개인이전을 월별로 분리할 수 없다. 월간 코리도 계열은 만들어내야만 하는 것이어서 제시하지 않는다.',
  '<b>축제 표시는 주석이며 투입값이 아니다.</b> 정렬을 직접 판단할 수 있도록 분기에 표시만 했다. 이를 추정에 넣고 그 결과를 축제가 송금을 움직인다는 근거로 읽으면 순환논증이므로 계산에서 제외했다.',
  '<b>이 돈의 상당 부분은 애초에 국제수지에 들어오지 않는다.</b> 2024년 World Bank/ILO의 CLM 이주노동자 1,770명 서베이는 그중 15% 미만만 은행 송금을 쓴다고 — 라오스는 10% — 보고한다. 나머지 대부분은 훈디(hundi)이거나 직접 들고 가는 현금이다. 태국중앙은행 계열은 공식 시스템을 거친 이전만 센다. 따라서 이 페이지의 \'태국에서 얼마가 나가는가\'는 기록된 경로로 나간 금액을 뜻하며, 실제 흐름은 아무도 측정하지 못한 만큼 더 크다.',
  '<b>같은 보고서를 두 가지로 읽은 결과가 서로 맞아야 한다.</b> 전국 국적별 집계와 주별 표는 같은 월간 PDF에서 나오지만 서로 다른 표이고, 서로 다른 코드가 읽는다. 이 둘이 5분의 1 넘게 어긋나면 그 달은 발행하지 않고 보류한다 — 둘 중 하나가 틀린 것인데 어느 쪽인지 늘 분명하지는 않다. 일부 분기에 전국 규모는 있는데 코리도 배분이 아예 없는 이유가 이것이다.',
  '<b>등록 노동자만 포함된다.</b> 미등록 노동자는 분모에서 빠지므로 1인당 값이 위로 편향된다.'];

let LANG = (() => {
  const l = (navigator.language || 'en').toLowerCase();
  return l.startsWith('th') ? 'th' : l.startsWith('ko') ? 'ko' : 'en';
})();
const T = k => I18N[LANG][k] !== undefined ? I18N[LANG][k] : I18N.en[k];
const cname = c => c[LANG] || c.en;

/* ── state, kept in the URL so a view can be sent to someone ───────── */
const METRICS = ['si', 'level', 'share', 'worker', 'yoy'];
const state = {
  corridor: 'ALL', metric: 'si', measuredOnly: false, sel: null,
  pool: 0.70, prop: {MM: 1, KH: 1, LA: 1, VN: 1}, province: null,
  sortKey: null, sortDir: -1,
};

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('c')) state.corridor = p.get('c');
  if (METRICS.includes(p.get('m'))) state.metric = p.get('m');
  if (p.get('g') === 'm') state.measuredOnly = true;
  if (p.get('lang') && I18N[p.get('lang')]) LANG = p.get('lang');
  if (p.get('pool')) state.pool = Math.min(1, Math.max(0.2, +p.get('pool') || 0.7));
  NATS.forEach(n => { const v = p.get('p' + n); if (v) state.prop[n] = Math.min(2, Math.max(0.4, +v || 1)); });
  if (p.get('q')) state.sel = p.get('q');
  // the map module is already initialised by the time this runs
  if (p.get('pm') && PV.months && PV.months[p.get('pm')]) mapMonth = p.get('pm');
  if (['workers', 'share', 'change'].includes(p.get('pv'))) mapMetric = p.get('pv');
  if (p.get('p')) state.province = p.get('p');
}
function writeHash() {
  const p = new URLSearchParams();
  if (state.corridor !== 'ALL') p.set('c', state.corridor);
  if (state.metric !== 'si') p.set('m', state.metric);
  if (state.measuredOnly) p.set('g', 'm');
  if (LANG !== 'en') p.set('lang', LANG);
  if (state.pool !== 0.7) p.set('pool', state.pool.toFixed(2));
  NATS.forEach(n => { if (state.prop[n] !== 1) p.set('p' + n, state.prop[n].toFixed(2)); });
  if (state.sel) p.set('q', state.sel);
  if (typeof mapMonth === 'string' && PV_KEYS.length && mapMonth !== PV_KEYS[PV_KEYS.length - 1])
    p.set('pm', mapMonth);
  if (mapMetric !== 'workers') p.set('pv', mapMetric);
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
  document.getElementById('lChips').innerHTML =
    ['en', 'th', 'ko'].map(l => chip(l.toUpperCase(), LANG === l, `data-lang="${l}"`)).join('');

  const rows = [`<div class="w"><label>${T('poolLabel')}</label><div class="r">
      <input type="range" min="20" max="100" step="1" value="${Math.round(state.pool * 100)}" data-pool>
      <span class="pv">${Math.round(state.pool * 100)}%</span></div></div>`];
  DATA.corridors.forEach(c => rows.push(`<div class="w"><label>${T('propLabel')(cname(c))}</label><div class="r">
      <input type="range" min="40" max="200" step="5" value="${Math.round(state.prop[c.code] * 100)}" data-prop="${c.code}">
      <span class="pv">${state.prop[c.code].toFixed(2)}×</span></div></div>`));
  document.getElementById('agrid').innerHTML = rows.join('');
  document.getElementById('lAssume').textContent = T('fAssume');
  document.getElementById('lAssumeHint').innerHTML = T('assumeHint');
  ['lCorridor:fCorridor', 'lMetric:fMetric', 'lGrade:fGrade', 'lLang:fLang'].forEach(p => {
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
        h += `<div class="cell nd${withheld ? ' void' : ''}" data-q="${q}"`
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
    <div class="row ${state.corridor === c.code ? 'sel' : ''}" data-c="${c.code}">
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
    <div class="row" data-c="${r.c.code}">
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
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
    aria-label="${T('chartTitle')}">`;
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
  MAP_PATHS = {
    w: ((maxX - minX) * kx * S + pad * 2).toFixed(0),
    h: (H + pad * 2).toFixed(0),
    d: geo.map(f => ({code: f.c, d: f.t === 'Polygon' ? poly(f.g) : f.g.map(poly).join('')})),
  };
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
  const host = document.getElementById('mapHost');
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
    chip(T('mChangeProv'), mapMetric === 'change', 'data-map="change"', !baseSnap);
  document.getElementById('mapTitle').textContent =
    T('mapTitle') + '  ·  ' + month + (cObj ? '  ·  ' + cname(cObj) : '');

  const i = PV_KEYS.indexOf(month);
  document.getElementById('monthBar').innerHTML =
    `<span class="lab">${T('monthLabel')}</span>`
    + `<input type="range" min="0" max="${PV_KEYS.length - 1}" step="1" value="${i}" data-month>`
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
  let svg = `<svg class="map" viewBox="0 0 ${P.w} ${P.h}" role="img" aria-label="${T('mapTitle')}">`;
  P.d.forEach(f => {
    const v = byCode[f.code];
    const cls2 = v == null ? 'nd' : '';
    const fill = v == null ? '' : ` fill="var(--${pal}${bin(v)})"`;
    svg += `<path class="${cls2}${state.province === f.code ? ' sel' : ''}"${fill}`
      + ` d="${f.d}" data-p="${f.code}"></path>`;
  });
  svg += '</svg>';
  host.innerHTML = svg;

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

  const ranked = Object.keys(byCode).filter(c => byCode[c] != null)
    .sort((a, b) => (diverging ? Math.abs(byCode[b]) - Math.abs(byCode[a])
                               : byCode[b] - byCode[a])).slice(0, 12);
  const max = ranked.length ? Math.abs(byCode[ranked[0]]) || 1 : 1;
  document.getElementById('provRank').innerHTML = ranked.map((code, i) => `
    <div class="row ${state.province === code ? 'sel' : ''}" data-p="${code}">
      <div class="i">${i + 1}</div>
      <div class="n">${PV_BY_CODE[code] ? (LANG === 'th' ? PV_BY_CODE[code].th : PV_BY_CODE[code].en) : code}</div>
      <div class="bar"><i style="width:${Math.max(2, 66 * Math.abs(byCode[code]) / max)}px"></i>
        <span class="v">${fmtP(byCode[code])}</span></div></div>`).join('');

  const cov = snap.coverage || {};
  document.getElementById('mapHint').innerHTML = T('mapHint')(
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
    `<th data-k="${keys[i]}"${state.sortKey === keys[i]
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
      p => `<p${p.startsWith('<b>What it cannot') || p.startsWith('<b>할 수 없는') ? ' class="warn"' : ''}>${p}</p>`).join('');
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
  tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(innerWidth - r.width - 10, ev.clientX + 14) + 'px';
  tip.style.top = Math.min(innerHeight - r.height - 10, ev.clientY + 14) + 'px';
}

/* ── wiring ──────────────────────────────────────────────────────────── */
function paintChrome() {
  document.documentElement.lang = T('htmlLang');
  // touch only our own classes -- a host page may own others on <body>
  ['en', 'th', 'ko'].forEach(l => document.body.classList.toggle('lang-' + l, l === LANG));
  document.getElementById('stamp').textContent =
    `${T('stamp')} · ${Q[Q.length - 1]} · ${DATA.meta.built}`;
  document.getElementById('h1').textContent = T('h1');
  document.getElementById('dek').innerHTML = T('dek');
  document.title = 'Mekong Remittance Corridors';
}
function renderAll() {
  paintChrome(); renderFacts(); renderControls(); renderBoard(); renderDetail();
  renderRank(); renderFlows(); renderContext(); renderChart(); renderMap();
  renderTable(); renderAbout(); markTrace();
  writeHash();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button.chip');
  if (b) {
    if (b.disabled) return;
    if (b.dataset.map) { mapMetric = b.dataset.map; renderMap(); writeHash(); return; }
    if (b.dataset.c) state.corridor = b.dataset.c;
    else if (b.dataset.m) state.metric = b.dataset.m;
    else if (b.dataset.g) state.measuredOnly = b.dataset.g === 'm';
    else if (b.dataset.lang) LANG = b.dataset.lang;
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
});
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
document.addEventListener('keydown', e => {
  const cell = e.target.closest && e.target.closest('.cell[data-q]');
  if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cell.click(); }
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
  tip.innerHTML = `<div class="tt">${LANG === 'th' ? p.th : p.en}</div>`
    + `<table><tr><td><b>${T('mWorkersProv')}</b></td>`
    + `<td style="text-align:right"><b>${nf(tot, 0)}</b></td><td></td></tr>${rows}</table>`
    + `<div class="fx">${mapMonth} · ${T('gradeA')}</div>`;
  tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(innerWidth - r.width - 10, ev.clientX + 14) + 'px';
  tip.style.top = Math.min(innerHeight - r.height - 10, ev.clientY + 14) + 'px';
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
      kind = T('roProvince'); what = pv ? (LANG === 'th' ? pv.th : pv.en) : path.dataset.p; }
    else if (row && row.dataset.c) { const c = DATA.corridors.find(x => x.code === row.dataset.c);
      kind = T('roCorridor'); what = c ? cname(c) : row.dataset.c; }
    else if (row && row.dataset.p) { const pv = PV_BY_CODE[row.dataset.p];
      kind = T('roProvince'); what = pv ? (LANG === 'th' ? pv.th : pv.en) : row.dataset.p; }
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
