import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavbarProps {
  brand: string;
  email: string;
}

const NAV_ITEMS = [
  { id: 'services', index: '01', label: 'Services' },
  { id: 'work', index: '02', label: 'Work' },
  { id: 'about', index: '03', label: 'About' },
  { id: 'contact', index: '04', label: 'Contact' }
] as const;

export function Navbar({ brand, email }: NavbarProps): JSX.Element {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 20);

      // Section spy
      const sections = ['services', 'work', 'about', 'contact'];
      let current = '';
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            current = sectionId;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header class={`site-header-sticky ${isScrolled ? 'is-scrolled' : ''}`}>
      <nav class="site-nav wrap" aria-label="Main navigation">
        <a class="brand" href="#top" onClick={closeMobileMenu} aria-label={`${brand} home`}>
          <span class="brand-mark" aria-hidden="true">✳</span>
          <span class="brand-name">{brand}</span>
          <span class="brand-telemetry" aria-hidden="true">
            <span class="status-dot" /> JKT · APAC
          </span>
        </a>

        {/* Desktop Links with Active Spy */}
        <div class="nav-links">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              class={activeSection === item.id ? 'active' : ''}
            >
              <span class="nav-idx" aria-hidden="true">{item.index}</span>
              {item.label}
              {activeSection === item.id && <span class="active-indicator" aria-hidden="true" />}
            </a>
          ))}
        </div>

        {/* Desktop Right Utilities */}
        <div class="nav-right">
          <ThemeToggle compact className="nav-theme-switch" />
          <a class="nav-cta" href={`mailto:${encodeURIComponent(email)}`}>
            Let’s talk <span class="cta-arrow" aria-hidden="true">↗</span>
          </a>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            class={`mobile-menu-trigger ${mobileMenuOpen ? 'is-open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span class="hamburger-bar" />
            <span class="hamburger-bar" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div class="mobile-drawer-backdrop" onClick={closeMobileMenu}>
          <div
            class="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="mobile-drawer-header">
              <span class="drawer-title">NAVIGATION</span>
              <button
                type="button"
                class="drawer-close-btn"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div class="mobile-nav-list">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  class={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span class="nav-idx">{item.index}</span>
                  <span class="nav-label">{item.label}</span>
                  <span class="nav-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>

            <div class="mobile-drawer-footer">
              <div class="mobile-theme-row">
                <span class="mobile-theme-label">APPEARANCE</span>
                <ThemeToggle />
              </div>
              <a
                class="button button-lime mobile-cta-btn"
                href={`mailto:${encodeURIComponent(email)}`}
                onClick={closeMobileMenu}
              >
                Let’s talk <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
