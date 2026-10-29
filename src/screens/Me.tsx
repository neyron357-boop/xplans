import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Verdict } from '../store/model';
import { useStore } from '../store/store';
import { setVerdict } from '../store/actions';
import { plural } from '../lib/dates';
import { tap } from '../lib/haptics';
import { readPatterns, WD, type Growing } from '../lib/patterns';
import { sortMemories } from '../lib/rings';
import { rememberTab, type MeTab } from '../lib/router';
import { useCountUp, useToday } from '../lib/useToday';
import { MemorySheet } from '../sheets/MemorySheets';
import { RulesSheet, ruleNo } from '../sheets/MeSheets';
import { Breath } from '../ui/Breath';
import { Fabric } from '../ui/Fabric';
import { Seg } from '../ui/Seg';

export function MeScreen({ tab }: { tab: MeTab }) {
  rememberTab('me', tab);
  return (
    <main class="screen">
      <Seg section="me" tab={tab} />
      <div class="tabview" key={tab}>
        {tab === 'patterns' && <Patterns />}
        {tab === 'code' && <Code />}
      </div>
    </main>
  );
}

const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;

/* Узоры */

interface Item {
  key: string;
  from: 'days' | 'words';
  text: string;
  fix?: string;
  /** A guess to check with you; facts are only shown. */
  ask: boolean;
  week?: (number | null)[];
  best?: number;
}

/** How long an answer stays on the card before the next question comes. */
const SETTLE_MS = 1400;

function Patterns() {
  const s = useStore();
  const today = useToday();
  const reading = useMemo(() => readPatterns(s, today), [s.days, today]);
  const items: Item[] = [
    ...reading.found.map((f) => ({ ...f, from: 'days' as const })),
    ...s.traits.map((t) => ({ key: `trait:${t.id}`, from: 'words' as const, text: t.text, fix: t.fix, ask: true })),
  ];
  const queue = items.filter((i) => i.ask && !s.verdicts[i.key]);
  const kept = items.filter((i) => !i.ask || s.verdicts[i.key] === 'yes');

  // One question at a time: the answer shows for a moment, then the next one rises.
  const [just, setJust] = useState<{ key: string; v: Verdict } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const answer = (key: string, v: Verdict) => {
    tap();
    setVerdict(key, v);
    setJust({ key, v });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJust(null), SETTLE_MS);
  };
  const undo = () => {
    if (!just) return;
    tap();
    clearTimeout(timer.current);
    setVerdict(just.key, undefined);
    setJust(null);
  };
  const current = just ? items.find((i) => i.key === just.key) : queue[0];
  const more = queue.length - (just ? 0 : 1);

  const ahead = reading.growing.map((g) => g.need - g.have);
  const soon = !reading.found.length && ahead.length ? Math.min(...ahead) : null;

  return (
    <>
      <div class="stack-8">
        <Fabric days={s.days} today={today} start={s.createdAt} best={reading.best} />
        {soon !== null && <span class="small muted fabric__note">{soon > 0 ? `узор проявится через ${days(soon)}` : 'узор зреет — нужны разные дни'}</span>}
      </div>
      <div class="tiles3">
        <Stat n={reading.stepRun} label={`${plural(reading.stepRun, 'шаг', 'шага', 'шагов')} подряд`} main />
        <Stat n={reading.roots7} label={`${plural(reading.roots7, 'корешок', 'корешка', 'корешков')} за 7 дней`} />
        <Stat n={reading.answered} label={`${plural(reading.answered, 'день', 'дня', 'дней')} в узоре`} />
      </div>
      {(current || kept.length > 0) && (
        <div class="stack-8">
          <span class="label">Что XPlans понял</span>
          {current && (
            <div class={`card pattern pattern--q${just ? ` is-${just.v}` : ''}`} key={current.key}>
              <div class="between">
                <span class="label">{current.from === 'days' ? 'Из твоих дней' : 'Из твоих слов'}</span>
                {more > 0 && <span class="code muted">ещё {more}</span>}
              </div>
              {current.week && <Rhythm week={current.week} best={current.best} />}
              <span class="pattern__text">{current.text}</span>
              {current.fix && <span class="pattern__fix">→ {current.fix}</span>}
              {just ? (
                <button type="button" class="verdict__done" aria-label={just.v === 'yes' ? 'Учтено. Отменить' : 'Убрано. Вернуть'} onClick={undo}>
                  {just.v === 'yes' ? '✓ учтено' : current.from === 'days' ? 'убрано · спрошу иначе' : 'убрано'}
                </button>
              ) : (
                <div class="verdict">
                  <button type="button" class="verdict__yes" onClick={() => answer(current.key, 'yes')}>
                    Верно
                  </button>
                  <button type="button" class="verdict__no" onClick={() => answer(current.key, 'no')}>
                    Не так
                  </button>
                </div>
              )}
            </div>
          )}
          {kept.length > 0 && (
            <div class="card kept">
              {kept.map((i) => (
                <KeptRow key={i.key} item={i} />
              ))}
            </div>
          )}
        </div>
      )}
      {reading.growing.length > 0 && <GrowingCard items={reading.growing} />}
    </>
  );
}

/** What is already known: one line each; a tap shows what helps. */
function KeptRow({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="kept__row">
      <button type="button" class="kept__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class={`kept__sign${item.ask ? ' is-yes' : ''}`} aria-hidden="true">
          {item.ask ? '✓' : '·'}
        </span>
        <span class="grow">{item.text}</span>
      </button>
      {open && (
        <div class="kept__body">
          {item.fix && <span class="small muted">→ {item.fix}</span>}
          {item.ask && (
            <button
              type="button"
              class="ghost ghost--left"
              onClick={() => {
                setOpen(false);
                setVerdict(item.key, undefined);
              }}
            >
              Спросить снова
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label, main }: { n: number; label: string; main?: boolean }) {
  const shown = useCountUp(n) ?? n;
  return (
    <div class="card stat">
      <span class={`stat__num${main && n > 0 ? ' sign-main' : ''}`}>{shown}</span>
      <span class="stat__label">{label}</span>
    </div>
  );
}

/** Strength by weekday as seven stems; the strongest day burns. */
function Rhythm({ week, best }: { week: (number | null)[]; best?: number }) {
  const label = week.map((m, i) => `${WD[i]} ${m == null ? '—' : m.toFixed(1)}`).join(', ');
  return (
    <div class="rhythm" role="img" aria-label={`Силы по дням: ${label}`}>
      {week.map((m, i) => (
        <span key={i} class={`rhythm__day${i === best ? ' is-best' : ''}`}>
          <span class="rhythm__bar" style={{ '--h': `${m == null ? 4 : Math.round(6 + (m / 5) * 38)}px`, '--i': String(i) }} />
          <span class="rhythm__l">{WD[i]}</span>
        </span>
      ))}
    </div>
  );
}

function GrowingCard({ items }: { items: Growing[] }) {
  return (
    <div class="growing">
      <span class="label">Зреет</span>
      {items.map((g, i) => {
        const left = g.need - g.have;
        return (
          <div key={g.key} class="grow-item">
            <div class="between">
              <span>{g.title}</span>
              <span class="code muted">{left > 0 ? `ещё ${days(left)}` : (g.wait ?? 'скоро')}</span>
            </div>
            <span class="grow-bar" role="img" aria-label={`Собрано ${g.have} из ${g.need}`}>
              <span style={{ width: `${Math.round((g.have / g.need) * 100)}%`, '--d': `${300 + i * 120}ms` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Кодекс */

function Code() {
  const s = useStore();
  const [edit, setEdit] = useState<number | null>(null);
  const [writing, setWriting] = useState(false);
  const [pausing, setPausing] = useState(false);
  return (
    <>
      <div class={`stack-8 rules${pausing ? ' is-quiet' : ''}`}>
        {s.rules.map((r, i) => (
          <button key={r.id} type="button" class="card rule-card" style={{ '--i': String(i) }} onClick={() => setEdit(i)}>
            <span class="rule-card__no">{ruleNo(i)}</span>
            <span class="grow">{r.text}</span>
          </button>
        ))}
        <button type="button" class="ghost ghost--left" onClick={() => setEdit(s.rules.length)}>
          + Правило
        </button>
      </div>
      <Breath onWrite={() => setWriting(true)} onRun={setPausing} />
      {edit !== null && <RulesSheet rules={s.rules} focus={edit} onClose={() => setEdit(null)} />}
      {writing && <MemorySheet memory={null} items={sortMemories(s.memories)} onSaved={() => {}} onClose={() => setWriting(false)} />}
    </>
  );
}
