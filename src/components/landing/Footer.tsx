import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';
import { StatusDot } from '../ui/StatusDot';

interface FooterProps {
  brand: string;
}

export function Footer({ brand }: FooterProps): JSX.Element {
  return (
    <footer class="site-footer-wrapper">
      <div class="wrap site-footer">
        <div class="footer-brand-col">
          <a class="brand" href="#top" aria-label={`${brand} back to top`}>
            <span class="brand-mark" aria-hidden="true">✳</span>
            <span class="brand-name">{brand}</span>
          </a>
          <span class="footer-tagline">Independent IT Services & Systems Engineering.</span>
          <div class="footer-telemetry" aria-hidden="true">
            <StatusDot />
            <span>Jakarta (GMT+7) · Serving APAC</span>
          </div>
        </div>

        <div class="footer-nav-col">
          <div class="footer-col-title">NAVIGATION</div>
          <div class="footer-nav-links">
            <a href="#services">Services</a>
            <a href="#work">Our Work</a>
            <a href="#about">About Northstar</a>
            <a href="#contact">Contact & Inquiries</a>
            <a href="/admin/">Studio Login ↗</a>
          </div>
        </div>

        <div class="footer-actions-col">
          <div class="footer-col-title">APPEARANCE</div>
          <div class="footer-theme-toggle">
            <ThemeToggle />
          </div>
          <div class="footer-copyright">
            © {new Date().getFullYear()} {brand}. Built with discipline & clarity.
          </div>
          <a href="#top" class="footer-top-link">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
