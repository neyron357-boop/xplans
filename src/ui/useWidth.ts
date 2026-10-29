import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';

/** The element's width, kept current as the screen turns or resizes. */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(Math.round(el.clientWidth) || fallback);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return width;
}
