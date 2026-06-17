import { HeroSection } from './HeroSection';
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
        <LandingProofSection />
        <FeaturedShowcase />
        <DropZoneSection />
        <GallerySection />
        <LandingFooter />
      </div>
    </>
  );
}
