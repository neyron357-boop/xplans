import { useState } from 'preact/hooks';
import type { DayKey, Habit, Id, Line } from '../store/model';
import { addLine, rememberNow, saveAce, saveHabits, setChange, setStep } from '../store/actions';
import { go } from '../lib/router';
import { Field } from '../ui/Field';
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

export function HabitsSheet({ habits, onClose }: Base & { habits: Habit[] }) {
  const [list, setList] = useState<{ id?: Id; name: string }[]>(() =>
    habits.length ? habits.map((h) => ({ id: h.id, name: h.name })) : [{ name: '' }],
  );
  const rename = (i: number, name: string) => setList(list.map((h, j) => (j === i ? { ...h, name } : h)));
  return (
    <Sheet title="Корешки" onClose={onClose}>
      {(close) => (
        <>
          <p class="small muted">Маленькие дела на каждый день.</p>
          <div class="stack-8">
            {list.map((h, i) => (
              <div class="row" key={h.id ?? `new-${i}`}>
                <input
                  class="input grow"
                  value={h.name}
                  aria-label={`Корешок ${i + 1}`}
                  placeholder="Например: EN · 20 мин"
                  onInput={(e) => rename(i, e.currentTarget.value)}
                />
                <button type="button" class="icon-btn" aria-label="Убрать" onClick={() => setList(list.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" class="ghost ghost--left" onClick={() => setList([...list, { name: '' }])}>
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
