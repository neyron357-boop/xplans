import { useState } from 'preact/hooks';
import type { Id } from '../store/model';
import { useStore } from '../store/store';
import { addLine, currentGoal, goalLines, nextCode } from '../store/actions';
import { handOff } from '../lib/handoff';
import { back } from '../lib/router';
import { REASONS, ideasFor } from '../lib/words';
import { Pill } from '../ui/Pill';
import { RootsView } from '../ui/RootsView';

interface Props {
  parentId?: Id;
  riskId?: Id;
  /** Make the new line the one you are on (after the old one closed). */
  activate: boolean;
}

/** Three steps: what breaks the line, what then, and the new root is drawn. */
export function WhatIfFlow({ parentId, riskId, activate }: Props) {
  const s = useStore();
  const goal = currentGoal(s);
  const lines = goalLines(s, goal?.id);
  const parent = lines.find((l) => l.id === (parentId ?? goal?.activeLineId));
  const risk = s.risks.find((r) => r.id === riskId);
  // A risk or an already closed line answers the first question.
  const preset = risk?.title ?? (parent?.closed ? parent.reason || 'Другое' : null);
  const [step, setStep] = useState(preset ? 2 : 1);
  const [reason, setReason] = useState(preset ?? '');
  const [plan, setPlan] = useState('');
  const [made, setMade] = useState<Id | null>(null);

  if (!goal) return null;
  const ideas = ideasFor(reason);
  const code = nextCode(s, goal.id, parent?.id ?? null);
  const madeLine = lines.find((l) => l.id === made);
  const dot = (n: number) => <span class={`dot${n === step ? ' is-now' : n < step ? ' is-past' : ''}`} />;

  const draw = () => {
    const id = addLine({
      goalId: goal.id,
      parentId: parent?.id ?? null,
      name: plan.trim() || ideas[0],
      cond: reason.toLowerCase(),
      activate,
      riskId: risk?.id,
    });
    setMade(id);
    setStep(3);
  };

  return (
    <main class="screen screen--flow">
      <div class="between">
        <button type="button" class="icon-btn back" aria-label="Отмена" onClick={() => back()}>
          ×
        </button>
        <div class="dots" role="img" aria-label={`Шаг ${step} из 3`}>
          {dot(1)}
          {dot(2)}
          {dot(3)}
        </div>
      </div>

      {step === 1 && (
        <div class="stack-24 fill">
          <h1 class="title">
            Что сломает{' '}
            {parent ? <span class={`code-title ${parent.id === goal.activeLineId ? 'sign-main' : 'sign-backup'}`}>{parent.code}</span> : 'план'}?
          </h1>
          <div class="stack-8">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                class="option option--row"
                onClick={() => {
                  setReason(r);
                  setPlan('');
                  setStep(2);
                }}
              >
                <span class="grow">{r}</span>
                <span class="muted" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div class="stack-24 fill">
          <div class="stack-8">
            <span class="tag">→ {reason.toLowerCase()}</span>
            <h1 class="title">Что тогда?</h1>
          </div>
          <div class="pills">
            {ideas.map((i) => (
              <Pill key={i} on={plan === i} onClick={() => setPlan(i)}>
                {i}
              </Pill>
            ))}
          </div>
          <textarea class="input" rows={2} aria-label="Своими словами" placeholder="или своё…" value={plan} onInput={(e) => setPlan(e.currentTarget.value)} />
          <button type="button" class="btn push" onClick={draw}>
            Нарисовать {code}
          </button>
        </div>
      )}

      {step === 3 && madeLine && (
        <div class="stack-24 fill">
          <h1 class="title">
            <span class={`code-title ${madeLine.id === goal.activeLineId ? 'sign-main' : 'sign-backup'}`}>{madeLine.code}</span> готова
          </h1>
          <RootsView lines={lines} activeId={goal.activeLineId} height={200} tags drawId={madeLine.id} />
          <div class="stack-4">
            <span>{madeLine.name}</span>
            <span class="small muted">→ {madeLine.cond}</span>
          </div>
          <div class="stack-8 push">
            <button
              type="button"
              class="btn"
              onClick={() => {
                handOff('line', madeLine.id);
                back('#/roots/tree');
              }}
            >
              Готово
            </button>
            <button
              type="button"
              class="ghost"
              onClick={() => {
                setStep(preset ? 2 : 1);
                setPlan('');
                setMade(null);
              }}
            >
              + Ещё линия
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
