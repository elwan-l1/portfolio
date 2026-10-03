import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { art, martian } from "@/app/fonts";
import { clearCache, measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext";

const FAMILY = martian.style.fontFamily;
const ART_FAMILY = art.style.fontFamily;
const WEIGHTS = [400, 700];

/** Canvas font shorthand, the format pretext measures with. */
export const font = (px: number, weight = 400) => `${weight} ${px}px ${FAMILY}`;

const artFont = (px: number) => `400 ${px}px ${ART_FAMILY}`;

let artWidth = 0;

/** Width of one art cell in em. */
export const artAdvance = (ready: boolean) => {
  if (!ready) return 0.6; // what the ASCII generator measured
  artWidth ||= measureNaturalWidth(prepareWithSegments("M".repeat(64), artFont(100))) / (64 * 100);
  return artWidth;
};

const fontsLoaded = () =>
  WEIGHTS.every((w) => document.fonts.check(font(16, w))) && document.fonts.check(artFont(16));

const subscribeFonts = (notify: () => void) => {
  let live = true;
  Promise.all([
    ...WEIGHTS.map((w) => document.fonts.load(font(16, w))),
    document.fonts.load(artFont(16)),
  ]).then(() => {
    clearCache(); // widths measured against the fallback font are wrong now
    if (live) notify();
  });
  return () => {
    live = false;
  };
};

/** True once the fonts the page measures with have loaded. False on the server. */
export const useFonts = () => useSyncExternalStore(subscribeFonts, fontsLoaded, () => false);

const FITTED = "(min-width: 75rem)"; // lg in globals.css

const subscribeFitted = (notify: () => void) => {
  const query = matchMedia(FITTED);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

/** The one-screen layout, where every tile has a fixed box. False on the server. */
export const useFitted = () =>
  useSyncExternalStore(
    subscribeFitted,
    () => matchMedia(FITTED).matches,
    () => false,
  );

/** Content-box width of an element, kept current on resize. */
export const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current!;
    setWidth(el.getBoundingClientRect().width); // before first paint, so nothing jumps
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};

/** Content-box size of an element, kept current on resize. */
export const useBox = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    setBox({ w: rect.width, h: rect.height });
    const observer = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
};
