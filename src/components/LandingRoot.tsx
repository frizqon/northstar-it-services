import type { JSX } from 'preact';
import type { SiteContent } from '../content/default';
import LandingPage from './LandingPage';
import { ErrorBoundary } from './ui/ErrorBoundary';

interface LandingRootProps {
  initialContent: SiteContent;
}

export default function LandingRoot({ initialContent }: LandingRootProps): JSX.Element {
  return (
    <ErrorBoundary>
      <LandingPage initialContent={initialContent} />
    </ErrorBoundary>
  );
}
