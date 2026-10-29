/** Passes a selection to the next screen, e.g. a new line to highlight in the tree. */
const slots = new Map<string, string>();

export function handOff(slot: 'line', id: string) {
  slots.set(slot, id);
}

export function take(slot: 'line'): string | null {
  const id = slots.get(slot) ?? null;
  slots.delete(slot);
  return id;
}
