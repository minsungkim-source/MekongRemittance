/* Two channels between the reading layer and the 3D component, so neither has
   to reach into the other.

   progress  how far the drawing has been scrolled into view, 0..1
   massing   what to draw: a value and a palette tone per province, plus the
             tallest value, recomputed whenever the map re-renders

   The reading layer publishes; the component subscribes. That keeps the colour
   and the height on the canvas derived from the same numbers as the choropleth
   underneath it -- the two layers cannot drift apart. */
function channel(initial) {
  let value = initial;
  const subs = new Set();
  return {
    get: () => value,
    set(v, epsilon) {
      if (epsilon != null && typeof v === 'number' && Math.abs(v - value) < epsilon) return;
      value = v;
      subs.forEach(fn => fn(value));
    },
    on(fn) { subs.add(fn); fn(value); return () => subs.delete(fn); },
  };
}

const progress = channel(0);
const massing = channel(null);
const geom = channel(null);       // {w, h, proj:[fx, fy]} -- the plan's own projection

export const setProgress = p => progress.set(Math.max(0, Math.min(1, p)), 0.0015);
export const onProgress = progress.on;
export const getProgress = progress.get;

export const setMassing = m => massing.set(m);
export const onMassing = massing.on;
export const getMassing = massing.get;

export const setGeom = g => geom.set(g);
export const onGeom = geom.on;
export const getGeom = geom.get;
