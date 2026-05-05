/**
 * Shared types, constants, and injected CSS animations for the landing page.
 */

import galleryData from '../gallery-data.json';

export interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  atoms: string;
  frames: string;
  file: string;
  available: boolean;
  colors: [string, string, string];
  featured?: boolean;
  metadata?: Record<string, string>;
}

export const ALL_EXAMPLES: GalleryExample[] = galleryData as any[];

export const FEATURED_IDS = [
  'c60_buckyball',
  'au_nanocluster',
  'cnt_6_6',
  'graphene_ribbon',
  'water_cluster_64',
  'cuzr_melt',
];

/** CSS keyframe animations injected once by LandingPage. */
export const ANIMATION_CSS = `
@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes heroScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(15,98,254,0.15); }
  50% { box-shadow: 0 0 40px rgba(15,98,254,0.35); }
}
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(8px); opacity: 1; }
}
@keyframes threadGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes counterUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes borderDash {
  to { stroke-dashoffset: -20; }
}
`;
