import { useState } from 'preact/hooks';
import type { Ace, Cover, Id, Line, Risk } from '../store/model';
import { useStore } from '../store/store';
import {
  addGoal,
  closeLine,
  currentGoal,
  deleteAce,
  deleteLine,
  deleteRisk,
  goalLines,
  renameGoal,
  runwayLeft,
  saveAce,
  saveRisk,
  setFocus,
  setRunway,
  updateLine,
} from '../store/actions';
import { useToday } from '../lib/useToday';
import { REASONS } from '../lib/words';
import { Field } from '../ui/Field';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';

interface Base {
  onClose: () => void;
}

const LineLabel = ({ line }: { line: Line }) => (
  <>
    <span class="mono">{line.code}</span> {line.name}
  </>
);

export function GoalSheet({ onClose }: Base) {
  const s = useStore();
  const goal = currentGoal(s);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [firstLine, setFirstLine] = useState('');
  const others = s.goals.filter((g) => g.id !== goal?.id);
  return (
    <Sheet title="Цель" onClose={onClose}>
      {(close) => (
        <>
          <Field label="Цель" hideLabel value={title} onChange={setTitle} />
          <button
            type="button"
            class="btn"
            disabled={!title.trim()}
            onClick={async () => {
              if (goal) renameGoal(goal.id, title);
              await close();
            }}
          >
            Сохранить
          </button>
          {others.length > 0 && (
            <div class="stack-8">
              <span class="label">Другие цели</span>
              {others.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  class="option option--row"
                  onClick={async () => {
                    setFocus(g.id);
                    await close();
                  }}
                >
                  <span class="grow">{g.title}</span>
                  <span class="muted" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
          {adding ? (
            <div class="stack-16 sheet__section">
              <Field label="Новая цель" focus value={newTitle} onChange={setNewTitle} placeholder="Например: английский на слух" />
              <Field label="Первая линия к ней" value={firstLine} onChange={setFirstLine} placeholder="Например: серия в день" />
              <button
                type="button"
                class="btn btn--quiet"
                disabled={!newTitle.trim() || !firstLine.trim()}
                onClick={async () => {
                  addGoal(newTitle, firstLine);
                  await close();
                }}
              >
                Добавить и перейти
              </button>
            </div>
          ) : (
            <button type="button" class="ghost ghost--left" onClick={() => setAdding(true)}>
              + Новая цель
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

export function LineSheet({ line, canDelete, onClose }: Base & { line: Line; canDelete: boolean }) {
  const [name, setName] = useState(line.name);
  const [cond, setCond] = useState(line.cond);
  const [sure, setSure] = useState(false);
  return (
    <Sheet title={`Линия ${line.code}`} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Название" value={name} onChange={setName} />
          <Field label="Когда переходить" value={cond} onChange={setCond} placeholder="Например: если 4 недели тихо" />
          <button
            type="button"
            class="btn"
            disabled={!name.trim()}
            onClick={async () => {
              updateLine(line.id, { name: name.trim(), cond: cond.trim() });
              await close();
            }}
          >
            Сохранить
          </button>
          {canDelete && (
            <button
              type="button"
              class="ghost"
              onClick={async () => {
                if (!sure) return setSure(true);
                await close();
                deleteLine(line.id);
              }}
            >
              {sure ? 'Точно удалить' : 'Удалить линию'}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Closing a line you are not on: no need to pick the next one. */
export function CloseSheet({ line, onClose }: Base & { line: Line }) {
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Sheet title={`Закрыть ${line.code}?`} onClose={onClose}>
      {(close) => (
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
          <button
            type="button"
            class="btn"
            onClick={async () => {
              closeLine(line.id, reason?.toLowerCase(), null);
              await close();
            }}
          >
            Закрыть линию
          </button>
        </>
      )}
    </Sheet>
  );
}

const coverKey = (c: Cover) => c.t + ('id' in c ? `:${c.id}` : '');

export function RiskSheet({ risk, onClose }: Base & { risk: Risk | null }) {
  const s = useStore();
  const goal = currentGoal(s);
  const [title, setTitle] = useState(risk?.title ?? '');
  const [covers, setCovers] = useState<Cover[]>(risk?.covers ?? []);
  const [sure, setSure] = useState(false);
  const has = (c: Cover) => covers.some((x) => coverKey(x) === coverKey(c));
  const flip = (c: Cover) => setCovers(has(c) ? covers.filter((x) => coverKey(x) !== coverKey(c)) : [...covers, c]);
  const lines = goalLines(s, goal?.id).filter((l) => !l.closed);
  return (
    <Sheet title={risk ? risk.title : 'Новый риск'} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Что может случиться" focus={!risk} value={title} onChange={setTitle} placeholder="Например: виза" />
          <div class="stack-8">
            <span class="label">Что прикрывает</span>
            <div class="pills">
              {lines.map((l) => (
                <Pill key={l.id} on={has({ t: 'line', id: l.id })} onClick={() => flip({ t: 'line', id: l.id })}>
                  <LineLabel line={l} />
                </Pill>
              ))}
              {s.aces.map((a) => (
                <Pill key={a.id} on={has({ t: 'ace', id: a.id })} onClick={() => flip({ t: 'ace', id: a.id })}>
                  ◆ {a.name}
                </Pill>
              ))}
              <Pill on={has({ t: 'runway' })} onClick={() => flip({ t: 'runway' })}>
                ◆ Запас
              </Pill>
              <Pill on={has({ t: 'low' })} onClick={() => flip({ t: 'low' })}>
                ‖ Режим «Нет сил»
              </Pill>
              <Pill on={has({ t: 'arc' })} onClick={() => flip({ t: 'arc' })}>
                1 арка в фокусе
              </Pill>
            </div>
          </div>
          <button
            type="button"
            class="btn"
            disabled={!title.trim()}
            onClick={async () => {
              saveRisk({ id: risk?.id, title, covers });
              await close();
            }}
          >
            Сохранить
          </button>
          {risk && (
            <button
              type="button"
              class="ghost"
              onClick={async () => {
                if (!sure) return setSure(true);
                await close();
                deleteRisk(risk.id);
              }}
            >
              {sure ? 'Точно убрать' : 'Убрать риск'}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

const toNumber = (v: string): number | null => {
  const n = parseInt(v.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

export function RunwaySheet({ onClose }: Base) {
  const s = useStore();
  const today = useToday();
  const goal = currentGoal(s);
  const left = runwayLeft(s, today);
  const [days, setDays] = useState(left === null ? '' : String(left));
  const [threshold, setThreshold] = useState(String(s.runway.threshold));
  const [lineId, setLineId] = useState<Id | null>(s.runway.lineId);
  const lines = goalLines(s, goal?.id).filter((l) => !l.closed);
  return (
    <Sheet title="Запас" onClose={onClose}>
      {(close) => (
        <>
          <Field label="На сколько дней хватит денег" numeric focus value={days} onChange={setDays} placeholder="Например: 30" />
          <Field label="Сигнал, когда останется дней" numeric value={threshold} onChange={setThreshold} />
          <div class="stack-8">
            <span class="label">Тогда переходить на</span>
            <div class="pills">
              {lines.map((l) => (
                <Pill key={l.id} on={lineId === l.id} onClick={() => setLineId(lineId === l.id ? null : l.id)}>
                  <LineLabel line={l} />
                </Pill>
              ))}
            </div>
          </div>
          <p class="small muted">Дни убывают сами. Обнови, когда придут или уйдут деньги.</p>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              setRunway({ days: toNumber(days), threshold: toNumber(threshold) ?? 14, lineId });
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

export function AceSheet({ ace, onClose }: Base & { ace: Ace | null }) {
  const s = useStore();
  const goal = currentGoal(s);
  const [name, setName] = useState(ace?.name ?? '');
  const [gives, setGives] = useState(ace?.gives ?? '');
  const [ids, setIds] = useState<Id[]>(ace?.lineIds ?? []);
  const [all, setAll] = useState(!!ace?.all);
  const [sure, setSure] = useState(false);
  const lines = goalLines(s, goal?.id).filter((l) => !l.closed);
  const flip = (id: Id) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  return (
    <Sheet title={ace ? ace.name : 'Новый козырь'} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Козырь" focus={!ace} value={name} onChange={setName} placeholder="Например: знакомый в сервисе" />
          <Field label="Что даёт" value={gives} onChange={setGives} placeholder="Чем поможет" />
          <div class="stack-8">
            <span class="label">Помогает линиям</span>
            <div class="pills">
              <Pill on={all} onClick={() => setAll(!all)}>
                Всем
              </Pill>
              {!all &&
                lines.map((l) => (
                  <Pill key={l.id} on={ids.includes(l.id)} onClick={() => flip(l.id)}>
                    <LineLabel line={l} />
                  </Pill>
                ))}
            </div>
          </div>
          <button
            type="button"
            class="btn"
            disabled={!name.trim()}
            onClick={async () => {
              saveAce({ id: ace?.id, name, gives, lineIds: ids, all });
              await close();
            }}
          >
            Сохранить
          </button>
          {ace && (
            <button
              type="button"
              class="ghost"
              onClick={async () => {
                if (!sure) return setSure(true);
                await close();
                deleteAce(ace.id);
              }}
            >
              {sure ? 'Точно убрать' : 'Убрать козырь'}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
