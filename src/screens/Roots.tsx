import { useState } from 'preact/hooks';
import type { Ace, Cover, Id, Line, Risk } from '../store/model';
import { useStore } from '../store/store';
import { coverOk, currentArc, currentGoal, goalLines, reopenLine, runwayLeft, setActive } from '../store/actions';
import { daysBetween, plural } from '../lib/dates';
import { take } from '../lib/handoff';
import { kindOf } from '../lib/roots';
import { go, rememberRootsTab, type RootsTab } from '../lib/router';
import { useCountUp, useToday } from '../lib/useToday';
import { AceSheet, CloseSheet, GoalSheet, LineSheet, RiskSheet, RunwaySheet } from '../sheets/RootsSheets';
import { StepSheet } from '../sheets/TodaySheets';
import { lineColor } from '../ui/LineChip';
import { RootsView } from '../ui/RootsView';
import { Seg } from '../ui/Seg';

export function RootsScreen({ tab }: { tab: RootsTab }) {
  rememberRootsTab(tab);
  return (
    <main class="screen">
      <Seg tab={tab} />
      <div class="tabview" key={tab}>
        {tab === 'tree' && <Tree />}
        {tab === 'ready' && <Ready />}
        {tab === 'aces' && <Aces />}
      </div>
    </main>
  );
}

/* Древо */

function Tree() {
  const s = useStore();
  const today = useToday();
  const goal = currentGoal(s);
  const lines = goalLines(s, goal?.id);
  const [grown] = useState(() => take('line'));
  const [selId, setSelId] = useState<Id | null>(() => grown ?? goal?.activeLineId ?? null);
  const [sheet, setSheet] = useState<'goal' | 'line' | 'step' | 'close' | null>(null);
  if (!goal) return null;

  const sel = lines.find((l) => l.id === selId) ?? lines.find((l) => l.id === goal.activeLineId) ?? lines[0];
  const arc = currentArc(s, goal.id);
  const week = arc ? Math.floor(daysBetween(arc.start, today) / 7) + 1 : 0;
  const close = () => setSheet(null);
  // As tall as the screen allows while the line card stays in view.
  const height = Math.round(Math.max(260, Math.min(360, innerHeight - 502)));

  return (
    <div class="stack-16">
      <div class="stack-4">
        {arc && (
          <span class="label">
            Арка {arc.no} · {week > arc.weeks ? 'финал' : `неделя ${week}`}
          </span>
        )}
        <button type="button" class="goal" onClick={() => setSheet('goal')}>
          {goal.title}
        </button>
      </div>
      <RootsView lines={lines} activeId={goal.activeLineId} height={height} onSelect={setSelId} selectedId={sel?.id} drawId={grown} here />
      {sel ? (
        <LinePanel
          line={sel}
          activeId={goal.activeLineId}
          onEdit={() => setSheet('line')}
          onStep={() => setSheet('step')}
          onClose={() => (sel.id === goal.activeLineId ? go(`#/switch?line=${sel.id}`) : setSheet('close'))}
        />
      ) : (
        <button type="button" class="btn" onClick={() => go('#/whatif')}>
          Нарисовать первую линию
        </button>
      )}
      {sheet === 'goal' && <GoalSheet onClose={close} />}
      {sheet === 'line' && sel && <LineSheet line={sel} canDelete={!lines.some((l) => l.parentId === sel.id)} onClose={close} />}
      {sheet === 'step' && sel && <StepSheet day={today} line={sel} onClose={close} />}
      {sheet === 'close' && sel && <CloseSheet line={sel} onClose={close} />}
    </div>
  );
}

interface PanelProps {
  line: Line;
  activeId: Id | null;
  onEdit: () => void;
  onStep: () => void;
  onClose: () => void;
}

function LinePanel({ line, activeId, onEdit, onStep, onClose }: PanelProps) {
  const kind = kindOf(line, activeId);
  const color = lineColor[kind];
  const cond = kind === 'main' ? [line.cond, 'ты здесь'].filter(Boolean).join(' · ') : line.cond || 'без условия';
  return (
    <div class="card panel" aria-live="polite">
      <div class="panel__head">
        <b class="panel__code" style={{ color }}>
          {line.code}
        </b>
        <span class="panel__name">{line.name}</span>
        {!line.closed && (
          <button type="button" class="icon-btn icon-btn--ink" aria-label="Добавить запасную линию" onClick={() => go(`#/whatif?parent=${line.id}`)}>
            +
          </button>
        )}
      </div>
      <div class="panel__row muted">
        <span class="panel__sign" aria-hidden="true">
          →
        </span>
        <span>{cond}</span>
      </div>
      {line.closed ? (
        <div class="panel__row">
          <span class="panel__sign sign-closed" aria-hidden="true">
            ○
          </span>
          <span>{line.reason ? `закрыта · ${line.reason}` : 'закрыта'}</span>
        </div>
      ) : (
        <button type="button" class="panel__row panel__step" onClick={onStep}>
          <span class="panel__sign" style={{ color }} aria-hidden="true">
            ●
          </span>
          <span>{line.step || 'Задать шаг'}</span>
        </button>
      )}
      <div class="panel__actions">
        <button type="button" class="ghost" onClick={onEdit}>
          Изменить
        </button>
        {!line.closed && kind !== 'main' && (
          <button type="button" class="ghost" onClick={() => setActive(line.id)}>
            Перейти сюда
          </button>
        )}
        {line.closed ? (
          <button type="button" class="ghost" onClick={() => reopenLine(line.id)}>
            Открыть снова
          </button>
        ) : (
          <button type="button" class="ghost" onClick={onClose}>
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
}

/* Что если */

function Covers({ covers }: { covers: Cover[] }) {
  const s = useStore();
  const activeId = currentGoal(s)?.activeLineId;
  return (
    <span class="covers">
      {covers.map((c) => {
        if (c.t === 'line') {
          const l = s.lines.find((x) => x.id === c.id);
          return l && !l.closed ? (
            <span key={c.id} style={{ color: lineColor[kindOf(l, activeId)] }}>
              {l.code}
            </span>
          ) : null;
        }
        if (c.t === 'ace') {
          const a = s.aces.find((x) => x.id === c.id);
          return a ? (
            <span key={c.id} class="sign-ace">
              ◆ {a.name}
            </span>
          ) : null;
        }
        if (c.t === 'runway')
          return s.runway.days == null ? null : (
            <span key="runway" class="sign-ace">
              ◆ запас
            </span>
          );
        if (c.t === 'low')
          return (
            <span key="low" class="muted">
              ‖
            </span>
          );
        return (
          <span key="arc" class="muted">
            1 арка
          </span>
        );
      })}
    </span>
  );
}

function Ready() {
  const s = useStore();
  const [edit, setEdit] = useState<Risk | 'new' | null>(null);
  const ok = (r: Risk) => r.covers.some((c) => coverOk(s, c));
  const n = s.risks.filter(ok).length;
  return (
    <>
      <h1 class="title">К чему ты готов?</h1>
      <div class="meter-row">
        <div class="meter" role="img" aria-label={`Готово ${n} из ${s.risks.length}`}>
          {s.risks.map((r, i) => (
            <span key={r.id} class={i < n ? 'is-on' : ''} style={{ '--n': String(i) }} />
          ))}
        </div>
        <span class="mono meter__count" aria-hidden="true">
          {n}/{s.risks.length}
        </span>
      </div>
      <div class="list">
        {s.risks.map((r) =>
          ok(r) ? (
            <button key={r.id} type="button" class="row-item" onClick={() => setEdit(r)}>
              <span class="grow">{r.title}</span>
              <Covers covers={r.covers} />
            </button>
          ) : (
            <div key={r.id} class="row-item row-item--open">
              <button type="button" class="row-item__main muted" onClick={() => setEdit(r)}>
                {r.title}
              </button>
              <button type="button" class="plus" aria-label={`${r.title} — нарисовать линию`} onClick={() => go(`#/whatif?risk=${r.id}`)}>
                <span aria-hidden="true">+</span>
              </button>
            </div>
          ),
        )}
      </div>
      <button type="button" class="ghost ghost--left" onClick={() => setEdit('new')}>
        + Риск
      </button>
      {edit && <RiskSheet risk={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

/* Рукав */

function Aces() {
  const s = useStore();
  const today = useToday();
  const left = runwayLeft(s, today);
  const shown = useCountUp(left) ?? left;
  const target = s.lines.find((l) => l.id === s.runway.lineId);
  const [open, setOpen] = useState<Id | null>(() => s.aces[0]?.id ?? null);
  const [sheet, setSheet] = useState<'runway' | 'new' | Ace | null>(null);
  return (
    <>
      <button type="button" class="card runway" onClick={() => setSheet('runway')}>
        <span class="between">
          <span class="label sign-ace">◆ Запас</span>
          <span class="code muted">
            &lt; {s.runway.threshold} дн{target ? ` → ${target.code}` : ''}
          </span>
        </span>
        {left === null ? (
          <span class="runway__empty">На сколько дней хватит денег?</span>
        ) : (
          <span class="runway__num">
            <span class="display">{shown}</span>
            <span class="muted">{plural(left, 'день', 'дня', 'дней')}</span>
          </span>
        )}
        <span class="runway__bar" role="img" aria-label={left === null ? 'Запас не задан' : `${left} из 90 дней`}>
          <span style={{ width: `${Math.min(100, ((left ?? 0) / 90) * 100)}%` }} />
        </span>
      </button>

      <div class="stack-8">
        {s.aces.map((a) => (
          <AceCard key={a.id} ace={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onEdit={() => setSheet(a)} />
        ))}
      </div>

      <button type="button" class="btn push" onClick={() => setSheet('new')}>
        + Козырь
      </button>
      {sheet === 'runway' && <RunwaySheet onClose={() => setSheet(null)} />}
      {sheet && sheet !== 'runway' && <AceSheet ace={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}
    </>
  );
}

function AceCard({ ace, open, onToggle, onEdit }: { ace: Ace; open: boolean; onToggle: () => void; onEdit: () => void }) {
  const s = useStore();
  const activeId = currentGoal(s)?.activeLineId;
  const helped = ace.lineIds.map((id) => s.lines.find((l) => l.id === id)).filter((l): l is Line => !!l && !l.closed);
  return (
    <div class="card ace">
      <button type="button" class="ace__head" aria-expanded={open} onClick={onToggle}>
        <span class="sign-ace" aria-hidden="true">
          ◆
        </span>
        <span class="grow">{ace.name}</span>
        <span class="covers">
          {ace.all ? (
            <span class="muted">все</span>
          ) : (
            helped.map((l) => (
              <span key={l.id} style={{ color: lineColor[kindOf(l, activeId)] }}>
                {l.code}
              </span>
            ))
          )}
        </span>
      </button>
      {open && (
        <div class="ace__body">
          {ace.gives && <span class="small muted">{ace.gives}</span>}
          <button type="button" class="ghost ghost--left" onClick={onEdit}>
            Изменить
          </button>
        </div>
      )}
    </div>
  );
}
