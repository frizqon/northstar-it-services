import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavbarProps {
  brand: string;
  email: string;
}

export function Navbar({ brand, email }: NavbarProps): JSX.Element {
  return (
    <nav class="site-nav wrap">
      <a class="brand" href="#top" aria-label={`${brand} home`}>
        <span class="brand-mark" aria-hidden="true">✳</span>
        {brand}
      </a>

      <div class="nav-links">
        <a href="#services">Services</a>
        <a href="#work">Our work</a>
        <a href="#about">About</a>
      </div>

      <div class="nav-right">
        <ThemeToggle compact />
        <a class="nav-cta" href={`mailto:${encodeURIComponent(email)}`}>
          Let’s talk <span aria-hidden="true">↗</span>
        </a>
      </div>
    </nav>
  );
}
