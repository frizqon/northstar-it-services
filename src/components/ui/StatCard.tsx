import type { JSX, TargetedMouseEvent } from 'preact';

interface StatCardProps {
  label: string;
  value: string | number;
  caption: string;
  isLive?: boolean;
  href?: string;
  onClick?: (e: TargetedMouseEvent<HTMLAnchorElement>) => void;
}

export function StatCard({ label, value, caption, isLive, href, onClick }: StatCardProps): JSX.Element {
  const content = (
    <>
      <span>{label}</span>
      <strong>
        {isLive && <span class="status-dot" aria-hidden="true" />}
        {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
      </strong>
      <small>{caption}</small>
    </>
  );

  if (href) {
    return (
      <a href={href} class={`stat-card ${isLive ? 'stat-live' : ''}`} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <div class={`stat-card ${isLive ? 'stat-live' : ''}`}>
      {content}
    </div>
  );
}
