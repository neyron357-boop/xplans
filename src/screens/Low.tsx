import { useStore } from '../store/store';
import { currentGoal, goalLines, setChange } from '../store/actions';
import { back } from '../lib/router';
import { useToday } from '../lib/useToday';
import { RootsView } from '../ui/RootsView';

export function LowFlow() {
  const s = useStore();
  const today = useToday();
  const goal = currentGoal(s);
  return (
    <main class="screen screen--low">
      <button type="button" class="icon-btn back" aria-label="Назад" onClick={() => back()}>
        ←
      </button>
      <h1 class="title low__title">Можно отдохнуть.</h1>
      <div class="stack-16">
        <RootsView lines={goalLines(s, goal?.id)} activeId={goal?.activeLineId} height={160} label="Корни плана на месте и ведут к цели" />
        <p class="small muted">План держится сам.</p>
      </div>
      <button
        type="button"
        class="btn push"
        onClick={() => {
          setChange(today, 'low');
          back();
        }}
      >
        До завтра
      </button>
    </main>
  );
}
