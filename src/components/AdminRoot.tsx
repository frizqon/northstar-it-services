import type { JSX } from 'preact';
import AdminApp from './AdminApp';
import { ErrorBoundary } from './ui/ErrorBoundary';

export default function AdminRoot(): JSX.Element {
  return (
    <ErrorBoundary>
      <AdminApp />
    </ErrorBoundary>
  );
}
