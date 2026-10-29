import { useState } from 'preact/hooks';
import type { Change } from '../store/model';
import { useStore } from '../store/store';
import { activeLine, currentGoal, runwayLeft, setActive, setChange, setEnergy, snoozeRunway, toggleHabit, toggleStep } from '../store/actions';
import { dayLabel } from '../lib/dates';
import { go } from '../lib/router';
import { useToday } from '../lib/useToday';
import { BrokeSheet, ChanceSheet, HabitsSheet, MovedSheet, StepSheet } from '../sheets/TodaySheets';
import { A } from '../ui/A';
import { InstallHint } from '../ui/InstallHint';
import { LineChip } from '../ui/LineChip';
import { StepCard } from '../ui/StepCard';

type SheetName = 'moved' | 'broke' | 'chance' | 'step' | 'habits';

const SIGNS: Record<Change, { sign: string; tone: string; label: string; done: string }> = {
  none: { sign: '=', tone: 'sign-muted sign-mono', label: 'Ничего', done: 'Ничего нового' },
  moved: { sign: '●', tone: 'sign-main', label: 'Сдвинулось', done: 'Сдвинулось' },
  broke: { sign: '○', tone: 'sign-closed', label: 'Сорвалось', done: 'Сорвалось' },
  chance: { sign: '◆', tone: 'sign-ace', label: 'Возможность', done: 'Возможность' },
  low: { sign: '‖', tone: 'sign-muted sign-mono', label: 'Нет сил', done: 'Отдых' },
};

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
    if (c === 'none') setChange(today, 'none');
    else if (c === 'low') go('#/low');
    else setSheet(c);
  };

  return (
    <main class="screen">
      <div class="between">
        <span class="label">{dayLabel(today)}</span>
        <A href="#/roots/aces" class="runway-pill" label={left === null ? 'Запас не задан' : `Запас на ${left} дн`}>
          ◆ {left ?? '?'} дн
        </A>
      </div>

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
        <section class="stack-24">
          <h1 class="title">Сколько сил?</h1>
          <div class="bars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                class="bar"
                aria-pressed={log.energy === n}
                aria-label={`Силы: ${n} из 5`}
                onClick={() => {
                  setEnergy(today, n);
                  setReask(false);
                }}
              >
                <span style={{ height: `${n * 16}px` }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'change' && (
        <section class="stack-24">
          <h1 class="title">Что изменилось?</h1>
          <div class="tiles">
            {(['none', 'moved', 'broke', 'chance', 'low'] as const).map((c) => (
              <button key={c} type="button" class={`tile${c === 'low' ? ' tile--wide' : ''}`} onClick={() => pick(c)}>
                <span class={`tile__sign ${SIGNS[c].tone}`} aria-hidden="true">
                  {SIGNS[c].sign}
                </span>
                <span>{SIGNS[c].label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'done' && log.change && (
        <section class="stack-16">
          <h1 class="title">Записано</h1>
          <div class="card summary">
            <span class={`summary__sign ${SIGNS[log.change].tone}`} aria-hidden="true">
              {SIGNS[log.change].sign}
            </span>
            <span class="grow stack-4">
              <span>{SIGNS[log.change].done}</span>
              {log.note && <span class="small muted">{log.note}</span>}
            </span>
            <button type="button" class="ghost" onClick={() => setChange(today, undefined)}>
              Изменить
            </button>
          </div>
        </section>
      )}

      {phase !== 'energy' && (
        <section class="stack-8">
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
              onToggle={() => toggleStep(today, line.id)}
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
              <button key={h.id} type="button" class="habit" aria-pressed={!!log.habits?.includes(h.id)} onClick={() => toggleHabit(today, h.id)}>
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
