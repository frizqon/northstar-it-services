import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX, TargetedEvent } from 'preact';
import type { SiteContent } from '../../content/default';
import { loadTurnstileScript } from '../../utils/turnstile';
import { StatusDot } from '../ui/StatusDot';

interface ContactSectionProps {
  contact: SiteContent['contact'];
}

export function ContactSection({ contact }: ContactSectionProps): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const mailtoUrl = `mailto:${encodeURIComponent(contact.email)}`;

  useEffect(() => {
    let cancelled = false;

    fetch('/api/config', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || typeof data?.turnstileSiteKey !== 'string' || !data.turnstileSiteKey) {
          return;
        }
        setTurnstileSiteKey(data.turnstileSiteKey);
      })
      .catch(() => {
        // The contact form still works when Turnstile is not configured.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey || status === 'success' || !turnstileContainer.current) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileContainer.current) {
          return;
        }

        turnstileWidgetId.current = window.turnstile.render(turnstileContainer.current, {
          sitekey: turnstileSiteKey,
          theme: 'auto',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => {
            setTurnstileToken('');
            setErrorMessage('Security challenge could not load. Please refresh the page and try again.');
          }
        });
      })
      .catch(() => {
        setErrorMessage('Security challenge failed to load. Please refresh and try again.');
      });

    return () => {
      cancelled = true;
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [turnstileSiteKey, status]);

  const handleSubmit = async (e: TargetedEvent<HTMLFormElement, Event>) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!trimmedMessage || trimmedMessage.length < 5) {
      setErrorMessage('Please enter a message (at least 5 characters).');
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setErrorMessage('Please complete the security challenge.');
      return;
    }

    setSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          ...(turnstileToken ? { turnstileToken } : {})
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message. Please try again later.');
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setTurnstileToken('');
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class="contact section-pad" id="contact">
      <div class="wrap contact-layout">
        <div class="contact-copy">
          <div class="contact-availability-badge">
            <StatusDot />
            <span>AVAILABLE FOR NEW ENGAGEMENTS</span>
          </div>

          <span class="section-kicker">05 / START A CONVERSATION</span>
          <h2>
            Big ambitions?
            <br />
            <em>Let’s engineer it.</em>
          </h2>

          <p class="contact-lead-desc">{contact.availability}</p>

          <div class="contact-telemetry-box">
            <div class="telemetry-item">
              <span class="telemetry-label">DIRECT INQUIRY</span>
              <a href={mailtoUrl} class="telemetry-val-link">{contact.email}</a>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">REGIONAL BASE</span>
              <span class="telemetry-val">{contact.location}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">RESPONSE SLA</span>
              <span class="telemetry-val">&lt; 24 business hours guaranteed</span>
            </div>
          </div>

          <div class="contact-spark" aria-hidden="true">✳</div>
        </div>

        <div class="contact-form-container">
          <div class="contact-form-card">
            <div class="contact-form-header">
              <div class="form-header-badge">INQUIRY CONSOLE</div>
              <h3>Send us a project briefing</h3>
              <p>Direct communication with our engineering leadership—no sales fluff.</p>
            </div>

            {status === 'success' ? (
              <div class="contact-success-state">
                <div class="contact-success-icon" aria-hidden="true">✓</div>
                <h4>Message transmitted successfully!</h4>
                <p>We have logged your inquiry into our Content Studio cockpit and will reply to your email within one business day.</p>
                <button
                  type="button"
                  class="button button-lime"
                  onClick={() => setStatus('idle')}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} class="contact-form" noValidate>
                {errorMessage && (
                  <div class="form-alert error" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div class="form-group">
                  <label for="contact-name">
                    Full Name <span class="required-mark" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    placeholder="e.g. Budi Santoso"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                    required
                    maxLength={100}
                    disabled={submitting}
                  />
                </div>

                <div class="form-group">
                  <label for="contact-email">
                    Work Email <span class="required-mark" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    required
                    maxLength={150}
                    disabled={submitting}
                  />
                </div>

                <div class="form-group">
                  <label for="contact-message">
                    Project Scope / Systems Overview <span class="required-mark" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    placeholder="Briefly describe what you are looking to build, modernize, or protect…"
                    value={message}
                    onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
                    required
                    maxLength={3000}
                    disabled={submitting}
                  />
                </div>

                {turnstileSiteKey && (
                  <div class="contact-turnstile" ref={turnstileContainer} aria-label="Security challenge" />
                )}

                <button
                  type="submit"
                  class="button button-lime contact-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Transmitting inquiry…' : 'Transmit inquiry'} <span aria-hidden="true">↗</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
