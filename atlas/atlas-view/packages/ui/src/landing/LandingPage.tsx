import { HeroSection } from './HeroSection';
import { FeaturedShowcase } from './FeaturedShowcase';
import { DropZoneSection } from './DropZoneSection';
import { GallerySection } from './GallerySection';
import { LandingFooter } from './LandingFooter';
import { ANIMATION_CSS } from './shared';

export function LandingPage() {
  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <div style={{ width: '100%', minHeight: '100vh', background: '#020204' }}>
        <HeroSection />
        <FeaturedShowcase />
        <DropZoneSection />
        <GallerySection />
        <LandingFooter />
      </div>
    </>
  );
}
