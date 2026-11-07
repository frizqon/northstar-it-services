import type { JSX } from 'preact';
import type { SiteContent } from '../../../content/default';
import { InputField } from '../../ui/InputField';

interface HeroEditorProps {
  brand: string;
  hero: SiteContent['hero'];
  onUpdateBrand: (brand: string) => void;
  onUpdateHero: (key: keyof SiteContent['hero'], value: string) => void;
}

export function HeroEditor({
  brand,
  hero,
  onUpdateBrand,
  onUpdateHero
}: HeroEditorProps): JSX.Element {
  return (
    <section class="editor-panel" id="hero">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">01 / FIRST IMPRESSION</span>
          <h2>Hero section</h2>
          <p>The first thing visitors see when they land on your site.</p>
        </div>
        <span class="panel-icon" aria-hidden="true">✳</span>
      </div>

      <div class="field-grid">
        <InputField
          label="Eyebrow"
          value={hero.eyebrow}
          onValueChange={(v) => onUpdateHero('eyebrow', v)}
        />
        <InputField
          label="Brand name"
          value={brand}
          onValueChange={onUpdateBrand}
        />
        <InputField
          label="Main heading"
          value={hero.title}
          onValueChange={(v) => onUpdateHero('title', v)}
        />
        <InputField
          label="Highlighted heading"
          value={hero.highlight}
          onValueChange={(v) => onUpdateHero('highlight', v)}
        />
        <InputField
          label="Description"
          value={hero.description}
          multiline={true}
          rows={3}
          onValueChange={(v) => onUpdateHero('description', v)}
        />
        <InputField
          label="Primary button"
          value={hero.primaryCta}
          onValueChange={(v) => onUpdateHero('primaryCta', v)}
        />
      </div>
    </section>
  );
}
