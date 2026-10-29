import { useState } from 'preact/hooks';
import type { Id } from '../store/model';
import { useStore } from '../store/store';
import { closeLine, currentGoal, goalLines, toggleStep } from '../store/actions';
import { back, go } from '../lib/router';
import { useToday } from '../lib/useToday';
import { REASONS } from '../lib/words';
import { StepSheet } from '../sheets/TodaySheets';
import { Pill } from '../ui/Pill';
import { RootsView } from '../ui/RootsView';
import { StepCard } from '../ui/StepCard';

/** The line you were on is closed: pick the next one, and the new root grows in. */
export function SwitchFlow({ lineId }: { lineId?: Id }) {
  const s = useStore();
  const today = useToday();
  const goal = currentGoal(s);
  const lines = goalLines(s, goal?.id);
  const [closingId] = useState(() => lineId ?? goal?.activeLineId ?? null);
  const closing = lines.find((l) => l.id === closingId);
  const [phase, setPhase] = useState<'pick' | 'done'>(() => (closing?.closed ? 'done' : 'pick'));
  // Its own backups first, then the other open lines.
  const candidates = lines
    .filter((l) => !l.closed && l.id !== closingId)
    .sort((a, b) => Number(b.parentId === closingId) - Number(a.parentId === closingId));
  const [nextId, setNextId] = useState<Id | null>(() => candidates[0]?.id ?? null);
  const [reason, setReason] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (!closing) {
    return (
      <main class="screen screen--flow">
        <button type="button" class="icon-btn back" aria-label="Назад" onClick={() => back()}>
          ←
        </button>
        <h1 class="title">Линии уже нет.</h1>
      </main>
    );
  }

  const next = lines.find((l) => l.id === (phase === 'done' ? goal?.activeLineId : nextId));
  const preview = phase === 'pick' ? lines.map((l) => (l.id === closing.id ? { ...l, closed: true } : l)) : lines;
  const log = s.days[today] ?? {};

  return (
    <main class="screen screen--flow">
      <button type="button" class="icon-btn back" aria-label="Назад" onClick={() => back()}>
        ←
      </button>
      <h1 class="title">
        {phase === 'done' && next ? (
          <>
            Ты на <span class="code-title sign-main">{next.code}</span>
          </>
        ) : (
          <>
            <span class="code-title sign-muted">{closing.code}</span> закрыта
          </>
        )}
      </h1>
      <RootsView
        lines={preview}
        activeId={phase === 'pick' ? null : goal?.activeLineId}
        height={220}
        tags
        drawId={phase === 'done' ? goal?.activeLineId : null}
      />

      {phase === 'pick' && (
        <>
          <div class="stack-8">
            <span class="label">Почему</span>
            <div class="pills">
              {REASONS.map((r) => (
                <Pill key={r} on={reason === r} onClick={() => setReason(reason === r ? null : r)}>
                  {r}
                </Pill>
              ))}
            </div>
          </div>
          {candidates.length > 1 && (
            <div class="stack-8">
              <span class="label">Дальше</span>
              <div class="pills">
                {candidates.map((c) => (
                  <Pill key={c.id} on={nextId === c.id} onClick={() => setNextId(c.id)}>
                    <span class="mono">{c.code}</span> {c.name}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          {next ? (
            <button
              type="button"
              class="btn push"
              onClick={() => {
                closeLine(closing.id, reason?.toLowerCase(), next.id);
                setPhase('done');
              }}
            >
              Перейти на {next.code}
            </button>
          ) : (
            <button
              type="button"
              class="btn push"
              onClick={() => {
                closeLine(closing.id, reason?.toLowerCase(), null);
                go(`#/whatif?parent=${closing.id}&activate=1`, { replace: true });
              }}
            >
              Нарисовать запасную
            </button>
          )}
        </>
      )}

      {phase === 'done' && (
        <div class="stack-8 push">
          {next && (
            <StepCard
              line={next}
              energy={log.energy}
              done={log.stepDone && log.stepLineId === next.id}
              onToggle={() => toggleStep(today, next.id)}
              onEdit={() => setEditing(true)}
            />
          )}
          <button type="button" class="btn" onClick={() => back()}>
            Готово
          </button>
        </div>
      )}

      {editing && next && <StepSheet day={today} line={next} onClose={() => setEditing(false)} />}
    </main>
  );
}
