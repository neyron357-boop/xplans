import { useState } from 'preact/hooks';
import type { Id } from '../store/model';
import { useStore } from '../store/store';
import { daysBetween, whenLabel } from '../lib/dates';
import { handOff } from '../lib/handoff';
import { sortMemories } from '../lib/rings';
import { go } from '../lib/router';
import { useToday } from '../lib/useToday';
import { BackupSheet, MemorySheet } from '../sheets/MemorySheets';
import { Rings } from '../ui/Rings';

const BACKUP_EVERY_DAYS = 7;

export function MemoryScreen() {
  const s = useStore();
  const today = useToday();
  const items = sortMemories(s.memories);
  const [selId, setSelId] = useState<Id | null>(null);
  const [sheet, setSheet] = useState<'add' | 'edit' | 'backup' | null>(null);
  const cur = items.find((m) => m.id === selId) ?? items[items.length - 1];
  const i = cur ? items.indexOf(cur) : -1;
  const since = s.backupAt ? daysBetween(s.backupAt, today) : null;
  const due = since === null || since >= BACKUP_EVERY_DAYS;
  const line = cur?.ref ? s.lines.find((l) => l.id === cur.ref) : undefined;
  const linksOut = (cur?.links ?? []).map((id) => items.find((m) => m.id === id)).filter((m) => !!m);
  const linksIn = cur ? items.filter((m) => m.links?.includes(cur.id)) : [];
  const close = () => setSheet(null);

  return (
    <main class="screen">
      <div class="between">
        <h1 class="title">Кольца</h1>
        <button type="button" class={`tag-btn${due ? ' is-due' : ''}`} onClick={() => setSheet('backup')}>
          {due ? 'Копия · пора' : 'Копия'}
        </button>
      </div>

      <Rings items={items} arcs={s.arcs} today={today} selectedId={cur?.id ?? null} onSelect={setSelId} />

      {cur ? (
        <div class="card memory" aria-live="polite">
          <div class="between memory__top">
            <span class="label">{whenLabel(cur.when)}</span>
            <span class="row">
              <button type="button" class="icon-btn" aria-label="Раньше" disabled={i <= 0} onClick={() => setSelId(items[i - 1].id)}>
                ‹
              </button>
              <button type="button" class="icon-btn" aria-label="Позже" disabled={i >= items.length - 1} onClick={() => setSelId(items[i + 1].id)}>
                ›
              </button>
            </span>
          </div>
          <span class="memory__title">{cur.title}</span>
          {cur.note && <span class="small muted">{cur.note}</span>}
          {linksOut.map((m) => (
            <button key={m.id} type="button" class="memory__link" onClick={() => setSelId(m.id)}>
              → {m.title}
            </button>
          ))}
          {linksIn.map((m) => (
            <button key={m.id} type="button" class="memory__link" onClick={() => setSelId(m.id)}>
              ← {m.title}
            </button>
          ))}
          {(line || cur.kind === 'arc') && (
            <button
              type="button"
              class="memory__link"
              onClick={() => {
                if (line) handOff('line', line.id);
                go('#/roots/tree', { replace: true });
              }}
            >
              → {line ? `${line.code} в корнях` : 'корни'}
            </button>
          )}
          <button type="button" class="ghost ghost--left" onClick={() => setSheet('edit')}>
            Изменить
          </button>
        </div>
      ) : (
        <p class="muted">Здесь будет то, что важно помнить.</p>
      )}

      <button type="button" class="btn push" onClick={() => setSheet('add')}>
        + Запомнить
      </button>

      {sheet === 'add' && <MemorySheet memory={null} items={items} onSaved={setSelId} onClose={close} />}
      {sheet === 'edit' && cur && <MemorySheet memory={cur} items={items} onSaved={setSelId} onClose={close} />}
      {sheet === 'backup' && <BackupSheet onClose={close} />}
    </main>
  );
}
