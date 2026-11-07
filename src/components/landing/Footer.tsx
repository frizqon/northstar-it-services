import type { JSX } from 'preact';

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
      <a href="#top">Back to top ↑</a>
    </footer>
  );
}
