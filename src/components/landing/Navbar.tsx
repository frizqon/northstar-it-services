import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavbarProps {
  brand: string;
  email: string;
}

export function Navbar({ brand, email }: NavbarProps): JSX.Element {
  return (
    <header class="site-header-sticky">
      <nav class="site-nav wrap" aria-label="Main navigation">
        <a class="brand" href="#top" aria-label={`${brand} home`}>
          <span class="brand-mark" aria-hidden="true">✳</span>
          <span class="brand-name">{brand}</span>
          <span class="brand-telemetry" aria-hidden="true">
            <span class="status-dot" /> JKT · APAC
          </span>
        </a>

        <div class="nav-links">
          <a href="#services"><span class="nav-idx" aria-hidden="true">01</span> Services</a>
          <a href="#work"><span class="nav-idx" aria-hidden="true">02</span> Work</a>
          <a href="#about"><span class="nav-idx" aria-hidden="true">03</span> About</a>
          <a href="#contact"><span class="nav-idx" aria-hidden="true">04</span> Contact</a>
        </div>

        <div class="nav-right">
          <ThemeToggle compact />
          <a class="nav-cta" href={`mailto:${encodeURIComponent(email)}`}>
            Let’s talk <span aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
