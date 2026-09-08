'use client';

/* The extruded drawing, as a React Three Fiber scene.
   Orthographic on purpose: this is an axonometric drawing and parallel lines
   have to stay parallel. Colour and height come from the model the reading
   layer publishes, so the canvas and the choropleth under it are the same
   reading -- one in tone, one in the vertical.                             */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { onProgress, onMassing, onGeom } from '@/lib/store';

function useToken(name, fallback) {
  const [c, setC] = useState(fallback);
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) setC(v);
    };
    read();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, [name]);
  return c;
}

/* One prism per province. Geometry is memoised on the projection, which never
   changes; only the material colour and the z scale move. */
function Provinces({ geo, geom, model, progress, onPick, onHover }) {
  const group = useRef();
  const shapes = useMemo(() => {
    if (!geom) return [];
    const [fx, fy] = geom.proj;
    const ring = (r) => {
      const s = new THREE.Shape();
      r.forEach((c, i) => {
        const x = fx(c) - geom.w / 2;
        const y = -(fy(c) - geom.h / 2);
        i ? s.lineTo(x, y) : s.moveTo(x, y);
      });
      return s;
    };
    return geo.map((f) => {
      const polys = f.t === 'Polygon' ? [f.g] : f.g;
      const shape = polys.map((pg) => {
        const outer = ring(pg[0]);
        pg.slice(1).forEach((h) => outer.holes.push(new THREE.Path(ring(h).getPoints())));
        return outer;
      });
      return { code: f.c, geometry: new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }) };
    });
  }, [geo, geom]);

  useEffect(() => () => shapes.forEach((s) => s.geometry.dispose()), [shapes]);

  const nodata = useToken('--nodata', '#ddd8c8');
  const inkTone = useToken('--ink', '#1a1e22');

  /* Resolve the palette once per model, not once per mesh per frame: reading a
     custom property forces style resolution and there are 77 of them. */
  const tones = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const cache = {};
    const out = {};
    if (model && model.byCode) {
      Object.entries(model.byCode).forEach(([code, m]) => {
        if (!m) { out[code] = nodata; return; }
        if (!(m.tone in cache)) cache[m.tone] = css.getPropertyValue(m.tone).trim() || nodata;
        out[code] = cache[m.tone];
      });
    }
    return out;
  }, [model, nodata]);

  // Laying the sheet back foreshortens the plan and turns depth into height,
  // so centre the block the reader sees, not the plan alone.
  const theta = (Math.PI / 2) * 0.62 * progress;
  const rise = (geom ? geom.max : 230) * Math.sin(theta) * progress;

  return (
    /* The group used to grow 16% as it lifted, which pushed its half-width from
       245 to 284 against a frame half-width of 251 -- so at full scroll the
       country's east and west edges were being cut off the sides. Growing the
       drawing is the camera's job, and the camera can do it within what the
       frame actually shows: the dolly above runs 0.88 to 1, which reads as the
       same swell and crops nothing. The group only tilts and rises. */
    <group
      ref={group}
      rotation-x={-theta}
      position-y={-rise / 2}
    >
      {shapes.map(({ code, geometry }) => {
        const m = model && model.byCode ? model.byCode[code] : null;
        const tone = tones[code] || nodata;
        const h = m ? Math.max(0.001, m.h * (geom ? geom.max : 230) * progress) : 0.001;
        const picked = model && model.selected === code;
        return (
          <mesh
            key={code}
            geometry={geometry}
            scale-z={h}
            onPointerOver={(e) => { e.stopPropagation(); onHover(code, e); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onPick(code); }}
          >
            <meshLambertMaterial
              color={tone}
              emissive={picked ? inkTone : '#000000'}
              emissiveIntensity={picked ? 0.22 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* The scroll dolly. The plan spans the full width of the frame -- its bounding
   box sits at x 6..496 of 502 -- so any zoom above 1 would cut the country's
   east and west extremes off the sides. The move is therefore entirely below
   1: the drawing opens small with air around it and closes at exactly 1,
   filling the frame as the columns finish rising. Nothing is ever cropped. */
const ZOOM_FROM = 0.88;
const ZOOM_TO = 1;
/* Smoothstep, so the push has no corner at either end -- it leaves rest and
   arrives at rest, which is what keeps a scrubbed move from feeling mechanical. */
const ease = (t) => t * t * (3 - 2 * t);

/* The camera has to cover the plan plus the headroom the columns rise into --
   the same box the SVG reserves in its viewBox -- or the drawing stretches. */
function Frame({ geom, progress, deps }) {
  const { camera, size, invalidate, advance } = useThree();
  useEffect(() => {
    if (!geom) return;
    const V = geom.h + geom.head;
    camera.left = -geom.w / 2;
    camera.right = geom.w / 2;
    camera.top = V / 2;
    camera.bottom = -V / 2;
    camera.near = -4000;
    camera.far = 4000;
    camera.zoom = ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * ease(progress);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, geom, size, invalidate, progress]);

  // one frame whenever the scroll scalar or the model moves
  useEffect(() => { invalidate(); }, [invalidate, deps]);

  // Verification hook: a synchronous frame. The interaction loop never needs
  // it, but a headless check cannot rely on requestAnimationFrame firing.
  useEffect(() => {
    window.__massAdvance = () => advance(performance.now());
    window.__massCam = () => ({
      zoom: camera.zoom,
      halfW: (camera.right - camera.left) / 2,
      halfV: (camera.top - camera.bottom) / 2,
      seesW: (camera.right - camera.left) / camera.zoom,
      seesV: (camera.top - camera.bottom) / camera.zoom,
    });
    return () => { delete window.__massAdvance; delete window.__massCam; };
  }, [advance, camera]);
  return null;
}

export default function Massing({ onPick, onHover }) {
  const [progress, setProgress] = useState(0);
  const [model, setModel] = useState(null);
  const [geom, setGeom] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // Reduced motion keeps the flat SVG plan; there is nothing to animate and
    // a static 3D view would only be a worse version of the drawing.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.createElement('canvas').getContext('webgl')) return;
    setOk(true);
    const offs = [onProgress(setProgress), onMassing(setModel), onGeom(setGeom)];
    return () => offs.forEach((off) => off());
  }, []);

  if (!ok || !geom) return null;

  return (
    /* The canvas re-presents the plan that is already in the accessibility tree
       as a labelled image, and the ranking beside it carries the same figures
       as text. A second, unlabelled graphic would only be noise to a reader. */
    <div className="glwrap" aria-hidden="true"
      style={{ aspectRatio: `${geom.w} / ${geom.h + geom.head}` }}>
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearAlpha(0);
        /* A mobile browser drops the GL context under memory pressure or when
           the tab is backgrounded for long enough. The canvas then sits blank
           over an SVG that CSS has hidden, which is a map showing nothing --
           so stand down and let the plan come back. */
        gl.domElement.addEventListener('webglcontextlost', () => setOk(false), { once: true });
      }}
    >
      <Frame geom={geom} progress={progress}
        deps={`${progress}|${model && model.month}|${model && model.metric}`} />
      <ambientLight intensity={0.86} />
      <directionalLight position={[-0.45, 1, 0.75]} intensity={0.62} />
      <directionalLight position={[0.6, 0.3, -0.5]} intensity={0.22} />
      <Provinces
        geo={geom.geo}
        geom={geom}
        model={model}
        progress={progress}
        onPick={onPick}
        onHover={onHover}
      />
    </Canvas>
    </div>
  );
}
