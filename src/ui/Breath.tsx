import { useEffect, useRef, useState } from 'preact/hooks';
import { notePause } from '../store/actions';
import { tap } from '../lib/haptics';
import { useToday } from '../lib/useToday';

const TOTAL = 90;
/** One breath: 4 seconds in, 6 out. */
const CYCLE = 10;
const IN = 4;

/**
 * "Задели?" A pause before answering: 90 seconds of slow breathing while the ring runs out.
 * Then answer later, put it into memory, or let it go.
 */
export function Breath({ onWrite, onRun }: { onWrite: () => void; onRun?: (running: boolean) => void }) {
  const today = useToday();
  const [left, setLeft] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const running = left !== null;
  useEffect(() => {
    onRun?.(running);
    // The breath and the three ways out all come into view together.
    if (running) requestAnimationFrame(() => box.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }));
  }, [running]);

  const start = () => {
    tap(12);
    notePause(today);
    const t0 = Date.now();
    setLeft(TOTAL);
    clearInterval(timer.current);
    // Counted from the clock, so the pause stays true when the phone sleeps.
    timer.current = window.setInterval(() => {
      const n = Math.max(0, TOTAL - Math.floor((Date.now() - t0) / 1000));
      setLeft(n);
      if (n === 0) {
        clearInterval(timer.current);
        tap(24);
      }
    }, 250);
  };
  const stop = () => {
    clearInterval(timer.current);
    setLeft(null);
  };

  const gone = left === null ? 0 : TOTAL - left;
  const breath = gone % CYCLE < IN ? 'вдох' : 'выдох';

  return (
    <div class={`pause-area${left === null ? '' : ' is-on'}`} ref={box}>
      {left === null ? (
        <button type="button" class="pause" onClick={start}>
          <span class="label">Задели?</span>
          <span class="pause__word">Пауза</span>
        </button>
      ) : (
        <>
          <div class={`breath${left === 0 ? ' is-done' : ''}`} role="timer" aria-label={left ? `Осталось ${left} секунд` : 'Пауза прошла'}>
            <span class="breath__disc" aria-hidden="true" />
            <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
              <circle class="breath__track" cx="80" cy="80" r="74" />
              <circle class="breath__ring" cx="80" cy="80" r="74" pathLength={1} transform="rotate(-90 80 80)" />
            </svg>
            <span class="breath__num">{left || '✓'}</span>
            <span class="small muted breath__word" key={left ? breath : 'done'}>
              {left ? breath : 'можно ответить'}
            </span>
          </div>
          <div class="stack-8 breath__acts">
            <button type="button" class="btn btn--quiet" onClick={stop}>
              Ответить позже
            </button>
            <button
              type="button"
              class="btn btn--quiet"
              onClick={() => {
                stop();
                onWrite();
              }}
            >
              Записать в Память
            </button>
            <button type="button" class="ghost" onClick={stop}>
              Отпустить
            </button>
          </div>
        </>
      )}
    </div>
  );
}
