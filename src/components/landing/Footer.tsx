import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';

interface FooterProps {
  brand: string;
}

export function Footer({ brand }: FooterProps): JSX.Element {
  return (
    <footer class="site-footer wrap">
      <a class="brand" href="#top" aria-label={`${brand} back to top`}>
        <span class="brand-mark" aria-hidden="true">✳</span>
        {brand}
      </a>
      <span>© {new Date().getFullYear()} {brand}. Thoughtful technology, built together.</span>
      <div class="footer-actions">
        <ThemeToggle compact />
        <a href="#top" class="footer-top-link">Back to top ↑</a>
      </div>
    </footer>
  );
}
