import type { JSX } from 'preact';

interface ToastNoticeProps {
  message: string;
  isError?: boolean;
}

export function ToastNotice({ message, isError = false }: ToastNoticeProps): JSX.Element | null {
  if (!message) return null;
  return (
    <div class={`notice ${isError ? 'error' : ''}`} role="alert">
      {message}
    </div>
  );
}
