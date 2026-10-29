import { useState } from 'preact/hooks';
import type { Id, Rule } from '../store/model';
import { saveRules } from '../store/actions';
import { Sheet } from '../ui/Sheet';
import { useFocusNew } from '../ui/useFocusNew';

export const ruleNo = (i: number) => String(i + 1).padStart(2, '0');

/** The code as a list: short rules, each on its own line. Opens on the rule that was tapped. */
export function RulesSheet({ rules, focus, onClose }: { rules: Rule[]; focus: number; onClose: () => void }) {
  const [list, setList] = useState<{ id?: Id; text: string }[]>(() => {
    const now = rules.map((r) => ({ id: r.id, text: r.text }));
    return focus >= now.length ? [...now, { text: '' }] : now;
  });
  const edit = (i: number, text: string) => setList(list.map((r, j) => (j === i ? { ...r, text } : r)));
  const { box, willAdd } = useFocusNew(list.length);
  return (
    <Sheet title="Кодекс" onClose={onClose}>
      {(close) => (
        <>
          <p class="small muted">Короткие правила, на которые можно опереться.</p>
          <div class="stack-8" ref={box}>
            {list.map((r, i) => (
              <div class="row" key={r.id ?? `new-${i}`}>
                <span class="code muted rule-no">{ruleNo(i)}</span>
                <input
                  class="input grow"
                  value={r.text}
                  aria-label={`Правило ${i + 1}`}
                  placeholder="Например: решаю на свежую голову"
                  data-autofocus={i === focus || undefined}
                  onInput={(e) => edit(i, e.currentTarget.value)}
                />
                <button type="button" class="icon-btn" aria-label="Убрать" onClick={() => setList(list.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            class="ghost ghost--left"
            onClick={() => {
              willAdd();
              setList([...list, { text: '' }]);
            }}
          >
            + Правило
          </button>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              saveRules(list);
              await close();
            }}
          >
            Сохранить
          </button>
        </>
      )}
    </Sheet>
  );
}
