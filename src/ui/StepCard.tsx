import type { Line } from '../store/model';
import { Check } from './Check';

interface Props {
  line: Line;
  energy?: number;
  done?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

/** On a low-energy day the step shrinks to its minimum. */
export function stepFor(line: Line, energy?: number) {
  const mini = !!line.mini && (energy ?? 3) <= 2;
  return { text: mini ? line.mini : line.step, mini };
}

export function StepCard({ line, energy, done, onToggle, onEdit }: Props) {
  const { text, mini } = stepFor(line, energy);
  if (!text) {
    return (
      <button type="button" class="step step--empty" onClick={onEdit}>
        <span class="step__plus" aria-hidden="true">
          +
        </span>
        <span class="grow">Задать шаг</span>
      </button>
    );
  }
  return (
    <div class={`step${done ? ' is-done' : ''}`}>
      <button type="button" class="step__check" aria-pressed={!!done} aria-label="Сделано" onClick={onToggle}>
        <Check done={!!done} />
      </button>
      <button type="button" class="step__body" onClick={onEdit}>
        <span class="step__text">{text}</span>
        {mini && <span class="code muted">минимум</span>}
      </button>
    </div>
  );
}
