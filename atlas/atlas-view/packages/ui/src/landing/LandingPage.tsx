import { HeroSection } from './HeroSection';
import { WorldHomeBackground } from './WorldHomeBackground';
import { LandingProofSection } from './LandingProofSection';
import { FeaturedShowcase } from './FeaturedShowcase';
import { DropZoneSection } from './DropZoneSection';
import { GallerySection } from './GallerySection';
import { LandingFooter } from './LandingFooter';
import { ANIMATION_CSS } from './shared';
import { HOME_SEO, useSeo } from '../seo';

export function LandingPage() {
  useSeo(HOME_SEO);

  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <div style={{ width: '100%', minHeight: '100vh', background: '#020204' }}>
        <HeroSection />
        <section
          aria-label="Choose the molecular world"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 'clamp(16px, 3vw, 26px) clamp(14px, 3vw, 28px)',
            background: '#020204',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ width: 'min(1280px, 100%)', margin: '0 auto' }}>
            <WorldHomeBackground />
          </div>
        </section>
        <LandingProofSection />
        <FeaturedShowcase />
        <DropZoneSection />
        <GallerySection />
        <LandingFooter />
      </div>
    </>
  );
}
