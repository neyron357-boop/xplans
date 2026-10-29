import { useState } from 'preact/hooks';
import type { Habit, Id, Study } from '../store/model';
import { useStore } from '../store/store';
import { addCheck, currentGoal, toggleHabit } from '../store/actions';
import { daysBetween, monthShort, plural } from '../lib/dates';
import { bestRun, doneOn, runBack, usualTime, weekOf } from '../lib/growth';
import { tap } from '../lib/haptics';
import { WD } from '../lib/patterns';
import { kindOf } from '../lib/roots';
import { rememberTab, type GrowthTab } from '../lib/router';
import { useCountUp, useToday } from '../lib/useToday';
import { StudySheet } from '../sheets/GrowthSheets';
import { HabitsSheet } from '../sheets/TodaySheets';
import { HabitMark, habitColor } from '../ui/HabitMark';
import { lineColor } from '../ui/LineChip';
import { Seg } from '../ui/Seg';
import { Sprouts } from '../ui/Sprouts';
import { Trail } from '../ui/Trail';
import { Wave } from '../ui/Wave';

export function GrowthScreen({ tab }: { tab: GrowthTab }) {
  rememberTab('growth', tab);
  return (
    <main class="screen">
      <Seg section="growth" tab={tab} />
      <div class="tabview" key={tab}>
        {tab === 'habits' && <Habits />}
        {tab === 'knowledge' && <Knowledge />}
      </div>
    </main>
  );
}

/* Привычки */

function Habits() {
  const s = useStore();
  const today = useToday();
  const habits = s.habits.filter((h) => !h.archived);
  // Opens on the first habit still waiting for today.
  const [selId, setSelId] = useState<Id | null>(() => (habits.find((h) => !doneOn(s.days, today, h.id)) ?? habits[0])?.id ?? null);
  const [sheet, setSheet] = useState<'edit' | 'add' | null>(null);
  const sel = habits.find((h) => h.id === selId) ?? habits[0];
  const colors = habits.map((h) => habitColor(s, h));

  return (
    <>
      <Sprouts
        habits={habits}
        colors={colors}
        days={s.days}
        today={today}
        selectedId={sel?.id ?? null}
        onSelect={setSelId}
        onToggle={(id) => toggleHabit(today, id)}
      />
      {sel ? (
        <HabitCard key={sel.id} habit={sel} color={colors[habits.indexOf(sel)]} onEdit={() => setSheet('edit')} />
      ) : (
        <p class="muted">Маленькое дело каждый день — и корешок идёт вглубь.</p>
      )}
      <button type="button" class="btn push" onClick={() => setSheet('add')}>
        + Корешок
      </button>
      {sheet && <HabitsSheet habits={habits} add={sheet === 'add'} onClose={() => setSheet(null)} />}
    </>
  );
}

function HabitCard({ habit, color, onEdit }: { habit: Habit; color: string; onEdit: () => void }) {
  const s = useStore();
  const today = useToday();
  const { run } = runBack(today, (k) => doneOn(s.days, k, habit.id));
  const best = bestRun(s.days, habit.id);
  const time = usualTime(s.days, habit.id, today);
  return (
    <div class="card hcard" style={{ '--c': color }}>
      <div class="hcard__top">
        <span class="hcard__name">{habit.name}</span>
        {time && (
          <span class="code muted" aria-label={`Обычно в ${time}`}>
            {time}
          </span>
        )}
        <HabitMark s={s} link={habit.link} />
      </div>
      <div class="hcard__stats" aria-live="polite">
        <span class="hcard__run">
          <b class="hcard__num" key={run}>
            {run}
          </b>
          <span class="small muted">{plural(run, 'день', 'дня', 'дней')} подряд</span>
        </span>
        {best > run && <span class="small muted">лучшая · {best}</span>}
      </div>
      <div class="week" role="group" aria-label="Эта неделя">
        {weekOf(today).map((k, i) => {
          const done = doneOn(s.days, k, habit.id);
          const style = { '--i': String(i) };
          if (k === today) {
            return (
              <button
                key={k}
                type="button"
                class="wd wd--today"
                aria-pressed={done}
                aria-label="Сегодня"
                onClick={() => {
                  tap();
                  toggleHabit(today, habit.id);
                }}
              >
                <span class="wd__dot" style={style} />
                <span class="wd__l">{WD[i]}</span>
              </button>
            );
          }
          const kind = k > today || (s.createdAt && k < s.createdAt) ? 'ahead' : done ? 'done' : 'miss';
          return (
            <span key={k} class={`wd wd--${kind}`}>
              <span class="wd__dot" style={style} />
              <span class="wd__l">{WD[i]}</span>
            </span>
          );
        })}
      </div>
      <button type="button" class="ghost ghost--left" onClick={onEdit}>
        Изменить
      </button>
    </div>
  );
}

/* Знание */

function Knowledge() {
  const s = useStore();
  const today = useToday();
  const measured = s.studies.filter((x) => x.measure);
  const rest = s.studies.filter((x) => !x.measure);
  const [open, setOpen] = useState<Id | null>(() => rest[0]?.id ?? null);
  const [sheet, setSheet] = useState<Study | 'new' | null>(null);
  return (
    <>
      {measured.map((st) => (
        <StudyCard key={st.id} study={st} today={today} onEdit={() => setSheet(st)} />
      ))}
      {rest.length > 0 && (
        <div class="stack-8">
          {rest.map((st) => (
            <StudyRow key={st.id} study={st} open={open === st.id} onToggle={() => setOpen(open === st.id ? null : st.id)} onEdit={() => setSheet(st)} />
          ))}
        </div>
      )}
      {!s.studies.length && <p class="muted">То, что ты учишь, и к чему это ведёт.</p>}
      <button type="button" class="ghost ghost--left" onClick={() => setSheet('new')}>
        + Знание
      </button>
      {sheet && <StudySheet study={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}
    </>
  );
}

/** A check once a month: a new one opens 30 days after the last. */
const EVERY = 30;

function StudyCard({ study, today, onEdit }: { study: Study; today: string; onEdit: () => void }) {
  const s = useStore();
  const line = study.lineId ? s.lines.find((l) => l.id === study.lineId) : undefined;
  const checks = study.measure?.checks ?? [];
  const start = study.measure?.start;
  const last = checks[checks.length - 1];
  const since = last ? daysBetween(last.day, today) : null;
  const due = since === null || since >= EVERY;
  const [picking, setPicking] = useState(false);
  const shown = useCountUp(last?.value ?? null) ?? last?.value;
  const low = last ? last.value : (start?.low ?? null);
  const high = last ? last.value : (start?.high ?? null);
  const level = last ? `${shown}%` : start ? `${start.low}–${start.high}%` : '—';
  // Five answers around the level you are at.
  const mid = low == null ? 50 : (low + (high ?? low)) / 2;
  const center = Math.min(80, Math.max(20, Math.round(mid / 10) * 10));
  const options = [-20, -10, 0, 10, 20].map((o) => center + o);
  const left = since === null ? 0 : EVERY - since;
  const pick = (v: number) => {
    tap();
    addCheck(study.id, today, v);
    setPicking(false);
  };

  return (
    <div class="card study">
      <div class="study__head">
        <button type="button" class="study__name" onClick={onEdit}>
          {study.name}
        </button>
        <span class="study__level">{level}</span>
      </div>
      {(study.next || line) && (
        <span class="small muted study__next">
          {study.next && `→ ${study.next}`}
          {line && (
            <span class="code" style={{ color: lineColor[kindOf(line, currentGoal(s)?.activeLineId)] }}>
              {line.code}
            </span>
          )}
        </span>
      )}
      <Wave low={low} high={high} />
      <div class="stack-8">
        <span class="label">Контрольные серии</span>
        <Trail checks={checks} start={start} due={due && !picking} />
      </div>
      {picking ? (
        <div class="stack-8 study__pick">
          <div class="between">
            <span class="small muted">Без субтитров — сколько понял?</span>
            <button type="button" class="icon-btn" aria-label="Отмена" onClick={() => setPicking(false)}>
              ×
            </button>
          </div>
          <div class="picks" role="group" aria-label="Сколько понял">
            {options.map((v) => (
              <button key={v} type="button" class="pick" onClick={() => pick(v)}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      ) : due ? (
        <button
          type="button"
          class="btn btn--quiet"
          onClick={() => {
            tap();
            setPicking(true);
          }}
        >
          Пройти контрольную
        </button>
      ) : (
        last && <CheckNote day={last.day} value={last.value} left={left} today={since === 0} onRedo={() => setPicking(true)} />
      )}
    </div>
  );
}

function CheckNote({ day, value, left, today, onRedo }: { day: string; value: number; left: number; today: boolean; onRedo: () => void }) {
  const text = `${monthShort(day)} · ${value}% · следующая через ${left >= 28 ? 'месяц' : `${left} ${plural(left, 'день', 'дня', 'дней')}`}`;
  // On the day of the check the answer can still be corrected.
  return today ? (
    <button type="button" class="study__note" aria-label={`${text}. Изменить оценку`} onClick={onRedo}>
      {text}
    </button>
  ) : (
    <span class="study__note">{text}</span>
  );
}

function StudyRow({ study, open, onToggle, onEdit }: { study: Study; open: boolean; onToggle: () => void; onEdit: () => void }) {
  const s = useStore();
  const line = study.lineId ? s.lines.find((l) => l.id === study.lineId) : undefined;
  return (
    <div class="card study-row">
      <button type="button" class="study-row__head" aria-expanded={open} onClick={onToggle}>
        <span class="grow">{study.name}</span>
        {line ? (
          <span class="code" style={{ color: lineColor[kindOf(line, currentGoal(s)?.activeLineId)] }}>
            {line.code}
          </span>
        ) : (
          <span class="code muted">позже</span>
        )}
      </button>
      {open && (
        <div class="study-row__body">
          {study.next && <span class="small muted">→ {study.next}</span>}
          <button type="button" class="ghost ghost--left" onClick={onEdit}>
            Изменить
          </button>
        </div>
      )}
    </div>
  );
}
