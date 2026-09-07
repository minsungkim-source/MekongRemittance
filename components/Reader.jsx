'use client';

/* Mounts the reading layer and hands it the libraries as arguments rather than
   letting it find them on `window`. Renders nothing: the markup it drives is
   the server-rendered shell in page.jsx, which is what a reader gets before
   any of this runs. */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initApp } from '@/lib/app';
import { DATA } from '@/lib/dataset';
import { setProgress, setMassing, setGeom } from '@/lib/store';

export default function Reader({ onApp }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;      // StrictMode mounts twice in development
    started.current = true;
    const api = initApp({ DATA, gsap, ScrollTrigger, Lenis, setProgress, setMassing, setGeom });
    if (onApp) onApp(api);
    // exposed for verification against the built page, the way window.MRC was
    window.MRC = api;
  }, [onApp]);
  return null;
}
