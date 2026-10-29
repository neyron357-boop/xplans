import { useState } from 'preact/hooks';
import type { DayKey, Habit, HabitLink, Id, Line } from '../store/model';
import { useStore } from '../store/store';
import { addLine, currentGoal, goalLines, rememberNow, saveAce, saveHabits, setChange, setStep } from '../store/actions';
import { go } from '../lib/router';
import { Field } from '../ui/Field';
import { HabitMark, linkedLine } from '../ui/HabitMark';
import { useFocusNew } from '../ui/useFocusNew';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';

interface Base {
  onClose: () => void;
}

export function MovedSheet({ day, line, onClose }: Base & { day: DayKey; line?: Line }) {
  const [text, setText] = useState('');
  const [keep, setKeep] = useState(true);
  return (
    <Sheet title="Что сдвинулось?" onClose={onClose}>
      {(close) => (
        <>
          <Field label="Что сдвинулось" hideLabel multiline focus value={text} onChange={setText} placeholder="Например: позвали на собеседование" />
          <Toggle on={keep} onClick={() => setKeep(!keep)}>
            В Память
          </Toggle>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              setChange(day, 'moved', text);
              if (keep && text.trim()) rememberNow(text, 'moved', line?.id);
              await close();
            }}
          >
            Готово
          </button>
        </>
      )}
    </Sheet>
  );
}

export function BrokeSheet({ day, line, onClose }: Base & { day: DayKey; line?: Line }) {
  const [stepOnly, setStepOnly] = useState(!line);
  const [note, setNote] = useState('');
  return (
    <Sheet title="Что сорвалось?" onClose={onClose}>
      {(close) =>
        stepOnly ? (
          <>
            {line && <p class="muted">Линия {line.code} держится. Завтра — новый шаг.</p>}
            <Field label="Что помешало" multiline focus value={note} onChange={setNote} placeholder="Можно пропустить" />
            <button
              type="button"
              class="btn"
              onClick={async () => {
                setChange(day, 'broke', note);
                await close();
              }}
            >
              Готово
            </button>
          </>
        ) : (
          line && (
            <div class="stack-8">
              <button type="button" class="option" onClick={() => setStepOnly(true)}>
                <span>Только шаг</span>
                {line.step && <span class="small muted">{line.step}</span>}
              </button>
              <button
                type="button"
                class="option"
                onClick={async () => {
                  setChange(day, 'broke');
                  await close();
                  go(`#/switch?line=${line.id}`);
                }}
              >
                <span>Вся линия {line.code}</span>
                <span class="small muted">{line.name}</span>
              </button>
            </div>
          )
        )
      }
    </Sheet>
  );
}

type ChanceKind = 'line' | 'ace' | 'memory';

export function ChanceSheet({ day, goalId, line, onClose }: Base & { day: DayKey; goalId: Id; line?: Line }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<ChanceKind>('memory');
  return (
    <Sheet title="Что за возможность?" onClose={onClose}>
      {(close) => (
        <>
          <Field label="Возможность" hideLabel focus value={text} onChange={setText} placeholder="Например: знакомый ищет продавца" />
          <div class="pills" role="group" aria-label="Куда записать">
            <Pill on={kind === 'line'} onClick={() => setKind('line')}>
              ● Новая линия
            </Pill>
            <Pill on={kind === 'ace'} onClick={() => setKind('ace')}>
              ◆ Козырь
            </Pill>
            <Pill on={kind === 'memory'} onClick={() => setKind('memory')}>
              Запомнить
            </Pill>
          </div>
          <button
            type="button"
            class="btn"
            disabled={!text.trim()}
            onClick={async () => {
              if (kind === 'line') addLine({ goalId, parentId: line?.id ?? null, name: text, cond: 'возможность' });
              else if (kind === 'ace') saveAce({ name: text, gives: '', lineIds: line ? [line.id] : [], all: false });
              else rememberNow(text, 'chance', line?.id);
              setChange(day, 'chance', text);
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

export function StepSheet({ day, line, onClose }: Base & { day: DayKey; line: Line }) {
  const [step, setStepText] = useState(line.step);
  const [mini, setMini] = useState(line.mini);
  return (
    <Sheet title={`Шаг · ${line.code}`} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Шаг" focus value={step} onChange={setStepText} placeholder="Например: 5 откликов" />
          <Field label="Если мало сил" value={mini} onChange={setMini} placeholder="Например: 1 отклик" />
          <button
            type="button"
            class="btn"
            onClick={async () => {
              setStep(day, line.id, step, mini);
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

type HabitDraft = { id?: Id; name: string; link?: HabitLink };

/** The list of habits; each can feed a line or the runway, which gives it that colour. */
export function HabitsSheet({ habits, add, onClose }: Base & { habits: Habit[]; add?: boolean }) {
  const s = useStore();
  const lines = goalLines(s, currentGoal(s)?.id).filter((l) => !l.closed);
  const [list, setList] = useState<HabitDraft[]>(() => {
    const now = habits.map((h) => ({ id: h.id, name: h.name, link: h.link }));
    return add || !now.length ? [...now, { name: '' }] : now;
  });
  const [open, setOpen] = useState<number | null>(null);
  const patch = (i: number, p: Partial<HabitDraft>) => setList(list.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const link = (i: number, l: HabitLink | undefined) => {
    patch(i, { link: l });
    setOpen(null);
  };
  const isLine = (h: HabitDraft, id: Id) => h.link?.t === 'line' && h.link.id === id;
  const { box, willAdd } = useFocusNew(list.length);
  return (
    <Sheet title="Корешки" onClose={onClose}>
      {(close) => (
        <>
          <p class="small muted">Маленькие дела на каждый день.</p>
          <div class="stack-8" ref={box}>
            {list.map((h, i) => (
              <div class="stack-8" key={h.id ?? `new-${i}`}>
                <div class="row">
                  <input
                    class="input grow"
                    value={h.name}
                    aria-label={`Корешок ${i + 1}`}
                    placeholder="Например: EN · 20 мин"
                    data-autofocus={(add && i === list.length - 1) || undefined}
                    onInput={(e) => patch(i, { name: e.currentTarget.value })}
                  />
                  <button
                    type="button"
                    class="link-btn"
                    aria-label={`Куда ведёт корешок ${i + 1}`}
                    aria-expanded={open === i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {h.link?.t === 'runway' || linkedLine(s, h.link) ? <HabitMark s={s} link={h.link} /> : <span class="chip chip--empty">→</span>}
                  </button>
                  <button type="button" class="icon-btn" aria-label="Убрать" onClick={() => setList(list.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
                {open === i && (
                  <div class="pills link-pills" role="group" aria-label="Куда ведёт">
                    <Pill on={!h.link} onClick={() => link(i, undefined)}>
                      Сам по себе
                    </Pill>
                    {lines.map((l) => (
                      <Pill key={l.id} on={isLine(h, l.id)} onClick={() => link(i, { t: 'line', id: l.id })}>
                        <span class="mono">{l.code}</span> {l.name}
                      </Pill>
                    ))}
                    <Pill on={h.link?.t === 'runway'} onClick={() => link(i, { t: 'runway' })}>
                      ◆ Запас
                    </Pill>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            class="ghost ghost--left"
            onClick={() => {
              willAdd();
              setList([...list, { name: '' }]);
            }}
          >
            + Корешок
          </button>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              saveHabits(list);
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
