import { useState } from 'preact/hooks';
import type { Change } from '../store/model';
import { useStore } from '../store/store';
import { activeLine, currentGoal, runwayLeft, setActive, setChange, setEnergy, snoozeRunway, toggleHabit, toggleStep } from '../store/actions';
import { dayLabel } from '../lib/dates';
import { tap } from '../lib/haptics';
import { go } from '../lib/router';
import { useMinute, useToday } from '../lib/useToday';
import { BrokeSheet, ChanceSheet, HabitsSheet, MovedSheet, StepSheet } from '../sheets/TodaySheets';
import { A } from '../ui/A';
import { InstallHint } from '../ui/InstallHint';
import { LineChip } from '../ui/LineChip';
import { Sign, TONE } from '../ui/Sign';
import { StepCard } from '../ui/StepCard';

type SheetName = 'moved' | 'broke' | 'chance' | 'step' | 'habits';

const WORDS: Record<Change, { label: string; done: string }> = {
  none: { label: 'Ничего', done: 'Ничего нового' },
  moved: { label: 'Сдвинулось', done: 'Сдвинулось' },
  broke: { label: 'Сорвалось', done: 'Сорвалось' },
  chance: { label: 'Возможность', done: 'Возможность' },
  low: { label: 'Нет сил', done: 'Отдых' },
};

/** The day runs from 04:00 to 04:00; the dot walks the line. */
function DayLine({ done }: { done: boolean }) {
  const m = useMinute();
  const pct = (((m - 240 + 1440) % 1440) / 1440) * 100;
  return (
    <div class={`dayline${done ? ' is-done' : ''}`} aria-hidden="true">
      <span class="dayline__dot" style={{ left: `${pct.toFixed(1)}%` }} />
    </div>
  );
}

/** Five stems; the chosen one lights up and the answer settles a beat later. */
function Stems({ value, onPick }: { value?: number; onPick: (n: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const lit = picked ?? value ?? 0;
  return (
    <div class="stems" role="group" aria-label="Силы">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          class={`stem${n <= lit ? ' is-lit' : ''}${n === lit ? ' is-on' : ''}`}
          style={{ '--n': String(n), '--h': `${12 + n * 14}px` }}
          aria-pressed={value === n}
          aria-label={`Силы: ${n} из 5`}
          onClick={() => {
            if (picked !== null) return;
            tap();
            setPicked(n);
            setTimeout(() => onPick(n), 560);
          }}
        >
          <span class="stem__bar" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** One question at a time: strength first, then what changed, then a quiet summary. */
export function Today() {
  const s = useStore();
  const today = useToday();
  const goal = currentGoal(s);
  const line = activeLine(s);
  const log = s.days[today] ?? {};
  const left = runwayLeft(s, today);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [reask, setReask] = useState(false);

  const target = s.lines.find((l) => l.id === s.runway.lineId && !l.closed);
  const alarm = left !== null && left <= s.runway.threshold && target && target.id !== line?.id && !log.runwaySnoozed ? target : null;
  const phase = reask || (!log.energy && !log.change) ? 'energy' : !log.change ? 'change' : 'done';
  const habits = s.habits.filter((h) => !h.archived);
  const close = () => setSheet(null);

  const pick = (c: Change) => {
    tap();
    if (c === 'none') setChange(today, 'none');
    else if (c === 'low') go('#/low');
    else setSheet(c);
  };

  return (
    <main class="screen">
      <header class="stack-16">
        <div class="between">
          <span class="label">{dayLabel(today)}</span>
          <A href="#/roots/aces" class="runway-pill" label={left === null ? 'Запас не задан' : `Запас на ${left} дн`}>
            ◆ {left ?? '?'} дн
          </A>
        </div>
        <DayLine done={phase === 'done'} />
      </header>

      <InstallHint />

      {alarm && (
        <div class="card alert">
          <div class="row">
            <span class="sign-ace" aria-hidden="true">
              ◆
            </span>
            <span class="grow">Запас {left} дн</span>
            <span class="muted" aria-hidden="true">
              →
            </span>
            <LineChip code={alarm.code} kind="backup" />
          </div>
          <div class="row">
            <button type="button" class="btn btn--sm" onClick={() => setActive(alarm.id)}>
              Перейти на {alarm.code}
            </button>
            <button type="button" class="ghost" onClick={() => snoozeRunway(today)}>
              Позже
            </button>
          </div>
        </div>
      )}

      {phase === 'energy' && (
        <section key="energy" class="stack-24">
          <h1 class="title">Сколько сил?</h1>
          <Stems
            value={log.energy}
            onPick={(n) => {
              setEnergy(today, n);
              setReask(false);
            }}
          />
        </section>
      )}

      {phase === 'change' && (
        <section key="change" class="stack-24">
          <h1 class="title">Что изменилось?</h1>
          <div class="tiles">
            {(['none', 'moved', 'broke', 'chance', 'low'] as const).map((c) => (
              <button key={c} type="button" class={`tile${c === 'low' ? ' tile--wide' : ''}`} style={{ '--tone': TONE[c] }} onClick={() => pick(c)}>
                <Sign kind={c} size={c === 'low' ? 24 : 28} />
                <span>{WORDS[c].label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'done' && log.change && (
        <section key="done" class="stack-16">
          <h1 class="title">Записано</h1>
          <div class="card summary">
            <Sign kind={log.change} size={24} />
            <span class="grow stack-4">
              <span>{WORDS[log.change].done}</span>
              {log.note && <span class="small muted">{log.note}</span>}
            </span>
            <button type="button" class="ghost" onClick={() => setChange(today, undefined)}>
              Изменить
            </button>
          </div>
        </section>
      )}

      {phase !== 'energy' && (
        <section key="step" class="stack-8">
          <div class="between">
            <span class="label row">
              Шаг дня
              {line && <LineChip code={line.code} kind="main" />}
            </span>
            {log.energy && (
              <button type="button" class="ghost" onClick={() => setReask(true)}>
                силы {log.energy}/5
              </button>
            )}
          </div>
          {line ? (
            <StepCard
              line={line}
              energy={log.energy}
              done={log.stepDone && log.stepLineId === line.id}
              onToggle={() => {
                tap();
                toggleStep(today, line.id);
              }}
              onEdit={() => setSheet('step')}
            />
          ) : (
            <A href="#/roots/tree" class="step step--empty">
              Выбрать линию в корнях
            </A>
          )}
        </section>
      )}

      <section class="stack-8 push">
        <div class="between">
          <span class="label">Корешки</span>
          <button type="button" class="ghost" onClick={() => setSheet('habits')}>
            Изменить
          </button>
        </div>
        {habits.length > 0 ? (
          <div class="habits">
            {habits.map((h) => (
              <button
                key={h.id}
                type="button"
                class="habit"
                aria-pressed={!!log.habits?.includes(h.id)}
                onClick={() => {
                  tap();
                  toggleHabit(today, h.id);
                }}
              >
                <span class="habit__ring" aria-hidden="true" />
                <span>{h.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" class="btn btn--quiet" onClick={() => setSheet('habits')}>
            + Корешок
          </button>
        )}
      </section>

      {sheet === 'moved' && <MovedSheet day={today} line={line} onClose={close} />}
      {sheet === 'broke' && <BrokeSheet day={today} line={line} onClose={close} />}
      {sheet === 'chance' && goal && <ChanceSheet day={today} goalId={goal.id} line={line} onClose={close} />}
      {sheet === 'step' && line && <StepSheet day={today} line={line} onClose={close} />}
      {sheet === 'habits' && <HabitsSheet habits={habits} onClose={close} />}
    </main>
  );
}
