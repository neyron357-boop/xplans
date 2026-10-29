import { useEffect, useRef } from 'preact/hooks';

/** After a row is added to a list of fields, puts the cursor into the new last field. */
export function useFocusNew(count: number) {
  const box = useRef<HTMLDivElement>(null);
  const added = useRef(false);
  useEffect(() => {
    if (!added.current) return;
    added.current = false;
    const fields = box.current?.querySelectorAll<HTMLInputElement>('input');
    fields?.[fields.length - 1]?.focus();
  }, [count]);
  return {
    box,
    /** Call together with adding the row. */
    willAdd: () => {
      added.current = true;
    },
  };
}
