import type { JSX } from 'preact';

interface InputFieldProps {
  label: string;
  value: string;
  onValueChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: 'text' | 'email';
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
      ) : type === 'email' ? (
        <input
          type="email"
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onInput={(e) => onValueChange((e.target as HTMLInputElement).value)}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onInput={(e) => onValueChange((e.target as HTMLInputElement).value)}
        />
      )}
      {hint && <small class="upload-hint">{hint}</small>}
    </label>
  );
}
