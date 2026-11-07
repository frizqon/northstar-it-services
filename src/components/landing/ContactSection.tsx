import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { SiteContent } from '../../content/default';

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

  const mailtoUrl = `mailto:${encodeURIComponent(contact.email)}`;

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement, Event>) => {
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

    setSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class="contact section-pad" id="contact">
      <div class="wrap contact-layout">
        <div class="contact-copy">
          <span class="section-kicker">LET’S GET STARTED</span>
          <h2>
            Big plans?
            <br />
            <em>Let’s talk tech.</em>
          </h2>
          <p>{contact.availability}</p>
          <div class="contact-direct">
            <a class="button button-lime" href={mailtoUrl}>
              Direct email <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div class="contact-meta">
            <a href={mailtoUrl}>{contact.email}</a>
            <span>{contact.location}</span>
          </div>
          <div class="contact-spark" aria-hidden="true">✳</div>
        </div>

        <div class="contact-form-container">
          <div class="contact-form-card">
            <div class="contact-form-header">
              <h3>Send us a message</h3>
              <p>Fill out the form below and our team will get in touch shortly.</p>
            </div>

            {status === 'success' ? (
              <div class="contact-success-state">
                <div class="contact-success-icon" aria-hidden="true">✓</div>
                <h4>Message sent successfully!</h4>
                <p>Thank you for reaching out. We have received your inquiry and will reply to your email soon.</p>
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
                  <label for="contact-name">Your Name</label>
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
                  <label for="contact-email">Email Address</label>
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
                  <label for="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    placeholder="Tell us about your project, current systems, or questions…"
                    value={message}
                    onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
                    required
                    maxLength={3000}
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  class="button button-lime contact-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Sending message…' : 'Send message'} <span aria-hidden="true">↗</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
