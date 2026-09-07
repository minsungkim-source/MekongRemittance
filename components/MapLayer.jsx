'use client';

/* The drawing: the SVG plan the reading layer writes into, and the extruded
   canvas over it. Siblings, so replacing the plan's markup cannot destroy the
   canvas. Hover and click on the canvas are forwarded to the same handlers the
   plan's paths use, so the two layers behave identically. */
import { useCallback } from 'react';
import dynamic from 'next/dynamic';

/* three and R3F are ~350 kB of the bundle, and a reader who never scrolls to
   the drawing never needs them. Split out, client-only: the SVG plan is what
   the page ships with and the canvas arrives when this component mounts. */
const Massing = dynamic(() => import('@/components/Massing'), { ssr: false });

export default function MapLayer() {
  const pick = useCallback((code) => {
    const path = document.querySelector(`svg.map path[data-p="${code}"]`);
    if (path) path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, []);

  const hover = useCallback((code, e) => {
    const tip = document.getElementById('tip');
    if (!code) { if (tip) tip.classList.remove('on'); return; }
    const path = document.querySelector(`svg.map path[data-p="${code}"]`);
    if (!path || !e) return;
    path.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true, clientX: e.clientX, clientY: e.clientY,
    }));
  }, []);

  return (
    <div className="mapbox" id="mapHost">
      <div id="mapPlan" />
      <Massing onPick={pick} onHover={hover} />
    </div>
  );
}
