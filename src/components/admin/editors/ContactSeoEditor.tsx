import type { JSX } from 'preact';
import type { SiteContent } from '../../../content/default';
import { InputField } from '../../ui/InputField';

interface ContactSeoEditorProps {
  contact: SiteContent['contact'];
  seo: SiteContent['seo'];
  onUpdateContact: (key: keyof SiteContent['contact'], value: string) => void;
  onUpdateSeo: (key: keyof SiteContent['seo'], value: string) => void;
}

export function ContactSeoEditor({
  contact,
  seo,
  onUpdateContact,
  onUpdateSeo
}: ContactSeoEditorProps): JSX.Element {
  return (
    <section class="editor-panel" id="contact-seo">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">05 / MAKE IT EASY TO CONNECT</span>
          <h2>Contact & SEO</h2>
          <p>Contact details and search engine metadata.</p>
        </div>
        <span class="panel-icon" aria-hidden="true">↗</span>
      </div>

      <div class="field-grid">
        <InputField
          label="Contact email"
          value={contact.email}
          type="email"
          onValueChange={(v) => onUpdateContact('email', v)}
        />
        <InputField
          label="Location"
          value={contact.location}
          onValueChange={(v) => onUpdateContact('location', v)}
        />
        <InputField
          label="Call to action"
          value={contact.availability}
          multiline={true}
          rows={2}
          onValueChange={(v) => onUpdateContact('availability', v)}
        />
        <InputField
          label="SEO page title"
          value={seo.title}
          onValueChange={(v) => onUpdateSeo('title', v)}
        />
        <InputField
          label="SEO description"
          value={seo.description}
          multiline={true}
          rows={3}
          onValueChange={(v) => onUpdateSeo('description', v)}
        />
      </div>
    </section>
  );
}
