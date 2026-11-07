import type { JSX, HTMLInputTypeAttribute, LooseInputHTMLAttributes } from 'preact';

interface InputFieldProps {
  label: string;
  value: string;
  onValueChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: string;
}

export function InputField({
  label,
  value,
  onValueChange,
  multiline = false,
  rows = 3,
  placeholder,
  type = 'text',
  required = false,
  autoComplete,
  autoFocus = false,
  hint
}: InputFieldProps): JSX.Element {
  const inputProps: LooseInputHTMLAttributes<HTMLInputElement> = {
    type,
    value,
    placeholder,
    required,
    autoComplete,
    autoFocus,
    onInput: (event) => onValueChange((event.target as HTMLInputElement).value)
  };

  return (
    <label class="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          onInput={(e) => onValueChange((e.target as HTMLTextAreaElement).value)}
        />
      ) : (
        // Preact 11 types inputs as a discriminated union by `type`. The loose
        // props are runtime-valid; narrow at the JSX boundary only.
        <input {...(inputProps as JSX.IntrinsicElements['input'])} />
      )}
      {hint && <small class="upload-hint">{hint}</small>}
    </label>
  );
}
