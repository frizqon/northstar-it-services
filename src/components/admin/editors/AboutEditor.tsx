import type { JSX } from 'preact';
import type { SiteContent } from '../../../content/default';
import { InputField } from '../../ui/InputField';

interface AboutEditorProps {
  about: SiteContent['about'];
  onUpdateAbout: (key: keyof SiteContent['about'], value: string) => void;
}

export function AboutEditor({ about, onUpdateAbout }: AboutEditorProps): JSX.Element {
  return (
    <section class="editor-panel" id="about">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">04 / YOUR STORY</span>
          <h2>About your team</h2>
          <p>Explain what makes your approach different.</p>
        </div>
        <span class="panel-icon" aria-hidden="true">◎</span>
      </div>

      <div class="field-grid">
        <InputField
          label="Headline"
          value={about.title}
          multiline={true}
          rows={2}
          onValueChange={(v) => onUpdateAbout('title', v)}
        />
        <InputField
          label="About description"
          value={about.description}
          multiline={true}
          rows={3}
          onValueChange={(v) => onUpdateAbout('description', v)}
        />
        <InputField
          label="Stat or milestone"
          value={about.stat}
          onValueChange={(v) => onUpdateAbout('stat', v)}
        />
        <InputField
          label="Stat caption"
          value={about.statLabel}
          onValueChange={(v) => onUpdateAbout('statLabel', v)}
        />
      </div>
    </section>
  );
}
