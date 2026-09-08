/* The reading surface. This is server-rendered and exported as static HTML, so
   the whole page -- every panel, the colophon, the readout -- is in the file a
   reader receives. The client layer then fills the numbers in.

   The ids are the contract with lib/app.js. They are deliberately unchanged
   from the single-file build: that module's behaviour is verified against
   them, and renaming things in the same pass as the framework move would have
   put both at risk at once. */
import Reader from '@/components/Reader';
import MapLayer from '@/components/MapLayer';

export default function Page() {
  return (
    <>
      {/* How far down the page you are. Fixed, 2px, and the only piece of
          chrome that follows the reader. */}
      <div className="readbar" aria-hidden="true"><i id="readfill" /></div>
      <div className="wrap">
        <section className="hero">
          <div className="hbar">
            <div>By <b>MSK</b></div>
            <div className="lab" id="stamp" />
          </div>
          <h1 id="h1" />
          <p className="dek" id="dek" />
          <div className="facts" id="facts" />
        </section>

        <div className="controls">
          <div className="ctl">
            <span className="klab" id="lCorridor" />
            <div className="chips" id="cChips" />
          </div>
          <div className="ctl">
            <span className="klab" id="lMetric" />
            <div className="chips" id="mChips" />
          </div>
          <div className="ctl">
            <span className="klab" id="lGrade" />
            <div className="chips" id="gChips" />
          </div>
          <details className="asm" id="asmBox">
            <summary id="lAssume" />
            <div className="agrid" id="agrid" />
            <p className="hint" id="lAssumeHint" />
          </details>
          {/* The corridor, metric and evidence controls rewrite every figure on
              the page. On screen that is obvious; to a reader it was silent. */}
          <p className="sronly" id="status" role="status" aria-live="polite" />
        </div>

        <div className="cols">
          <div>
            <div className="panel">
              <div className="ptitle"><h2 id="boardTitle" /><span id="boardGrade" /></div>
              <div id="boardBanner" />
              <div className="gridwrap" data-lenis-prevent>
                <div className="qgrid" id="board" />
              </div>
              <div className="legend" id="legend" />
              <div className="legcap">
                <span id="legLo" /><span id="legMid" /><span id="legHi" />
              </div>
              <p className="hint" id="boardHint" />
            </div>

            <div className="panel">
              <div className="ptitle"><h2 id="chartTitle" /><span className="g gA">A</span></div>
              <div id="chartHost" />
              <div className="clg" id="chartLeg" />
              <p className="hint" id="chartHint" />
            </div>

            <div className="panel">
              <div className="ptitle"><h2 id="flowTitle" /><span className="g gB">B</span></div>
              <div className="flows" id="flows" />
              <p className="hint" id="flowHint" />
            </div>
          </div>

          <div>
            <div className="panel sub"><div id="detail" /></div>
            <div className="panel sub">
              <div className="ptitle"><h2 id="rankTitle" /><span className="g gB">B</span></div>
              <div className="rank" id="rank" />
              <p className="hint" id="rankHint" />
            </div>
            <div className="panel sub">
              <div className="ptitle"><h2 id="ctxTitle" /><span className="g gA">A</span></div>
              <div className="rank" id="ctx" />
              <p className="hint" id="ctxHint" />
            </div>
          </div>
        </div>

        <div className="panel" id="mapPanel">
          {/* The drawing is 910px tall, so by the time you are reading the
              south of the country the month and the metric have scrolled away.
              The head stays. */}
          <div className="maphead">
            <div className="ptitle">
              <h2 id="mapTitle" />
              <div className="chips" id="mapChips" />
              <span className="g gA" id="mapGrade">A</span>
            </div>
            <div className="monthbar" id="monthBar" />
          </div>
          <div className="mapcols">
            <MapLayer />
            <div>
              <div className="legend" id="mapLegend" />
              <div className="legcap"><span id="mapLegLo" /><span id="mapLegHi" /></div>
              <div className="rank" id="provRank" />
            </div>
          </div>
          <p className="hint" id="mapHint" />
        </div>

        <div className="panel">
          <div className="ptitle"><h2 id="tblTitle" /><span className="lab" id="tblHint" /></div>
          <div className="scroll tallscroll" data-lenis-prevent>
            <table id="tbl" aria-labelledby="tblTitle">
              <thead><tr id="thead" /></thead>
              <tbody id="tbody" />
            </table>
          </div>
        </div>

        <section className="about">
          {[1, 2, 3, 4].map((n) => (
            <div className="dirrow" key={n}>
              <div className="dirnum">{String(n).padStart(2, '0')}</div>
              <div className="dircell">
                <span className="klab" id={`lAb${n}`} />
                <div id={`ab${n}`} />
                {n === 3 && (
                  <>
                    <dl className="asof" id="asof" />
                    <div className="scroll" style={{ marginTop: 12 }}>
                      <table className="srctable" id="srctbl">
                        <thead><tr id="sthead" /></thead>
                        <tbody id="stbody" />
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="tip" id="tip" />
      <div className="rule-out" id="ruleOut" aria-hidden="true">
        <span><i>X</i> <b id="roX">—</b></span>
        <span><i>Y</i> <b id="roY">—</b></span>
        <span className="at"><i id="roLabel">over</i> <b id="roAt">the sheet</b></span>
      </div>

      <Reader />
    </>
  );
}
