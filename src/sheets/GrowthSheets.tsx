import { useState } from 'preact/hooks';
import type { Id, Study } from '../store/model';
import { useStore } from '../store/store';
import { currentGoal, deleteStudy, goalLines, saveStudy } from '../store/actions';
import { Field } from '../ui/Field';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';

export function StudySheet({ study, onClose }: { study: Study | null; onClose: () => void }) {
  const s = useStore();
  const lines = goalLines(s, currentGoal(s)?.id).filter((l) => !l.closed || l.id === study?.lineId);
  const [name, setName] = useState(study?.name ?? '');
  const [next, setNext] = useState(study?.next ?? '');
  const [lineId, setLineId] = useState<Id | null>(study?.lineId ?? null);
  const [measured, setMeasured] = useState(!!study?.measure);
  const [sure, setSure] = useState(false);
  // Checks already taken are history: such a skill stays measured.
  const locked = !!study?.measure?.checks.length;
  return (
    <Sheet title={study ? study.name : 'Что учишь?'} onClose={onClose}>
      {(close) => (
        <>
          <Field label="Что учишь" hideLabel={!study} focus={!study} value={name} onChange={setName} placeholder="Например: английский на слух" />
          <Field label="К чему ведёт" value={next} onChange={setNext} placeholder="Например: 3 работы в портфолио" />
          <div class="stack-8">
            <span class="label">Линия</span>
            <div class="pills">
              {lines.map((l) => (
                <Pill key={l.id} on={lineId === l.id} onClick={() => setLineId(lineId === l.id ? null : l.id)}>
                  <span class="mono">{l.code}</span> {l.name}
                </Pill>
              ))}
              <Pill on={lineId === null} onClick={() => setLineId(null)}>
                Позже
              </Pill>
            </div>
          </div>
          {!locked && (
            <Toggle on={measured} onClick={() => setMeasured(!measured)}>
              Контрольная раз в месяц
            </Toggle>
          )}
          <button
            type="button"
            class="btn"
            disabled={!name.trim()}
            onClick={async () => {
              saveStudy({ id: study?.id, name, next, lineId, measured });
              await close();
            }}
          >
            Сохранить
          </button>
          {study && (
            <button
              type="button"
              class="ghost"
              onClick={async () => {
                if (!sure) return setSure(true);
                await close();
                deleteStudy(study.id);
              }}
            >
              {sure ? 'Точно убрать' : 'Убрать'}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
