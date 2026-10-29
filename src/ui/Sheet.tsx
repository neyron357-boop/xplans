import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { pushOverlay } from '../lib/router';

export type Close = () => Promise<void>;

interface Props {
  title: string;
  onClose: () => void;
  /** Gets `close`, which resolves once the sheet is gone. */
  children: (close: Close) => ComponentChildren;
}

/** Bottom sheet. The phone's back gesture, a tap outside and Escape all close it. */
export function Sheet({ title, onClose, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const overlay = useRef<ReturnType<typeof pushOverlay> | null>(null);

  // Layout effect: the history entry must exist before the first tap can close the sheet.
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    overlay.current = pushOverlay(() => onCloseRef.current());
    const first = box.current?.querySelector<HTMLElement>('[data-autofocus]');
    (first ?? box.current)?.focus();
    return () => {
      overlay.current?.dispose();
      before?.focus?.();
    };
  }, []);

  const close: Close = () => {
    if (overlay.current) return overlay.current.close();
    onCloseRef.current();
    return Promise.resolve();
  };

  return (
    <div
      class="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) void close();
      }}
    >
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={box}
        onKeyDown={(e) => {
          if (e.key === 'Escape') void close();
        }}
      >
        <div class="sheet__head">
          <h2 class="sheet__title">{title}</h2>
          <button type="button" class="icon-btn" aria-label="Закрыть" onClick={() => void close()}>
            ×
          </button>
        </div>
        {children(close)}
      </div>
    </div>
  );
}
