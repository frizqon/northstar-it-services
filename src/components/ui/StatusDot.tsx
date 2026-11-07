import type { JSX } from 'preact';

interface StatusDotProps {
  ariaLabel?: string;
}

export function StatusDot({ ariaLabel }: StatusDotProps): JSX.Element {
  return <span class="status-dot" aria-label={ariaLabel} aria-hidden={!ariaLabel} />;
}
