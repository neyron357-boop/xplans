import type { TargetedEvent } from 'preact';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  /** Keep the label for screen readers only, when the sheet title already asks the question. */
  hideLabel?: boolean;
  focus?: boolean;
}

export function Field({ label, value, onChange, placeholder, multiline, numeric, hideLabel, focus }: Props) {
  const onInput = (e: TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.currentTarget.value);
  return (
    <label class="field">
      <span class={hideLabel ? 'sr-only' : 'field__label'}>{label}</span>
      {multiline ? (
        <textarea class="input" rows={2} value={value} placeholder={placeholder} onInput={onInput} data-autofocus={focus || undefined} />
      ) : (
        <input
          class="input"
          type="text"
          inputMode={numeric ? 'numeric' : undefined}
          value={value}
          placeholder={placeholder}
          onInput={onInput}
          data-autofocus={focus || undefined}
        />
      )}
    </label>
  );
}
