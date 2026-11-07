import type { JSX } from 'preact';
import type { SiteContent } from '../../content/default';

interface ContactSectionProps {
  contact: SiteContent['contact'];
}

export function ContactSection({ contact }: ContactSectionProps): JSX.Element {
  const mailtoUrl = `mailto:${encodeURIComponent(contact.email)}`;

  return (
    <section class="contact section-pad" id="contact">
      <div class="wrap contact-inner">
        <span class="section-kicker">LET’S GET STARTED</span>
        <h2>
          Big plans?
          <br />
          <em>Let’s talk tech.</em>
        </h2>
        <p>{contact.availability}</p>
        <a class="button button-lime" href={mailtoUrl}>
          Start a conversation <span aria-hidden="true">↗</span>
        </a>
        <div class="contact-meta">
          <a href={mailtoUrl}>{contact.email}</a>
          <span>{contact.location}</span>
        </div>
        <div class="contact-spark" aria-hidden="true">✳</div>
      </div>
    </section>
  );
}
