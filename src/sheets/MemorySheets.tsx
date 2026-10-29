import type { TargetedEvent } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { AppState, Id, Memory, When } from '../store/model';
import { getState, replaceState, useStore } from '../store/store';
import { deleteMemory, markBackup, saveMemory } from '../store/actions';
import { readBackup, shareBackup } from '../store/backup';
import { normalize } from '../store/normalize';
import { agoLabel, daysBetween, plural, whenLabel, whenOf } from '../lib/dates';
import { useToday } from '../lib/useToday';
import { Field } from '../ui/Field';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';

interface Base {
  onClose: () => void;
}

const sameWhen = (a: When | null, b: When | null) => a?.y === b?.y && a?.m === b?.m && a?.d === b?.d;

export function MemorySheet({ memory, items, onSaved, onClose }: Base & { memory: Memory | null; items: Memory[]; onSaved: (id: Id) => void }) {
  const today = useToday();
  const now = whenOf(today);
  const [title, setTitle] = useState(memory?.title ?? '');
  const [note, setNote] = useState(memory?.note ?? '');
  const [when, setWhen] = useState<When | null>(memory ? memory.when : now);
  const [links, setLinks] = useState<Id[]>(memory?.links ?? []);
  const [sure, setSure] = useState(false);
  // An exact date other than today can be kept, but not typed: pick a year instead.
  const kept = memory?.when?.m && !sameWhen(memory.when, now) ? memory.when : null;
  const others = memory ? items.filter((x) => x.id !== memory.id).slice(-8).reverse() : [];
  const flipLink = (id: Id) => setLinks(links.includes(id) ? links.filter((x) => x !== id) : [...links, id]);

  return (
    <Sheet title={memory ? 'Изменить' : 'Что запомнить?'} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Что" hideLabel={!memory} focus={!memory} value={title} onChange={setTitle} placeholder="Например: первое собеседование" />
          <Field label="Подробнее" multiline value={note} onChange={setNote} placeholder="Можно пропустить" />
          <div class="stack-8">
            <span class="label">Когда</span>
            <div class="pills">
              <Pill on={sameWhen(when, now)} onClick={() => setWhen(now)}>
                Сегодня
              </Pill>
              {kept && (
                <Pill on={sameWhen(when, kept)} onClick={() => setWhen(kept)}>
                  {whenLabel(kept)}
                </Pill>
              )}
              {[now.y, now.y - 1, now.y - 2].map((y) => (
                <Pill key={y} on={!!when && !when.m && when.y === y} onClick={() => setWhen({ y })}>
                  {y}
                </Pill>
              ))}
              <Pill on={when === null} onClick={() => setWhen(null)}>
                Раньше
              </Pill>
            </div>
          </div>
          {others.length > 0 && (
            <div class="stack-8">
              <span class="label">Связано с</span>
              <div class="pills">
                {others.map((x) => (
                  <Pill key={x.id} on={links.includes(x.id)} onClick={() => flipLink(x.id)}>
                    {x.title}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            class="btn"
            disabled={!title.trim()}
            onClick={async () => {
              const id = saveMemory({ id: memory?.id, title, note, when, links });
              onSaved(id);
              await close();
            }}
          >
            {memory ? 'Сохранить' : 'Запомнить'}
          </button>
          {memory && (
            <button
              type="button"
              class="ghost"
              onClick={async () => {
                if (!sure) return setSure(true);
                await close();
                deleteMemory(memory.id);
              }}
            >
              {sure ? 'Точно удалить' : 'Удалить'}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

export function BackupSheet({ onClose }: Base) {
  const s = useStore();
  const today = useToday();
  const file = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<AppState | null>(null);
  const [error, setError] = useState(false);
  const since = s.backupAt ? daysBetween(s.backupAt, today) : null;

  const pick = async (e: TargetedEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      setIncoming(normalize(await readBackup(f)));
      setError(false);
    } catch {
      setError(true);
    }
  };

  return (
    <Sheet title="Копия" onClose={onClose}>
      {(close) =>
        incoming ? (
          <>
            <p>Заменить данные на телефоне этой копией?</p>
            <p class="small muted">
              В копии {incoming.lines.length} {plural(incoming.lines.length, 'линия', 'линии', 'линий')} и {incoming.memories.length}{' '}
              {plural(incoming.memories.length, 'воспоминание', 'воспоминания', 'воспоминаний')}.
            </p>
            <button
              type="button"
              class="btn"
              onClick={async () => {
                replaceState(incoming);
                await close();
              }}
            >
              Заменить
            </button>
            <button type="button" class="ghost" onClick={() => setIncoming(null)}>
              Отмена
            </button>
          </>
        ) : (
          <>
            <p class="small muted">Всё хранится только на этом телефоне. Сохрани копию в файл или отправь себе.</p>
            <span class="small">{since === null ? 'Копии ещё не было' : `Последняя копия: ${agoLabel(since)}`}</span>
            <button
              type="button"
              class="btn"
              onClick={async () => {
                if (await shareBackup(getState())) markBackup();
              }}
            >
              Сохранить копию
            </button>
            <button type="button" class="btn btn--quiet" onClick={() => file.current?.click()}>
              Загрузить из файла
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={pick} />
            {error && (
              <p class="small muted" role="status">
                Это не копия XPlans.
              </p>
            )}
          </>
        )
      }
    </Sheet>
  );
}
