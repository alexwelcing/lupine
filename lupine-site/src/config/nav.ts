import { site } from './site';

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  cta?: boolean;
}

export const mainNav: NavItem[] = [
  { label: 'Distill', href: '/distill' },
  { label: 'Verifier', href: '/verifier' },
  { label: 'Research', href: '/research' },
  { label: 'Viewer', href: site.viewerUrl, external: true },
  { label: 'Investors', href: '/investors' },
  { label: 'Contact', href: '/contact', cta: true },
];

export const footerNav = {
  product: [
    { label: 'Distill Engine', href: '/distill' },
    { label: 'Verifier', href: '/verifier' },
    { label: 'Free Viewer', href: site.viewerUrl, external: true },
  ],
  company: [
    { label: 'Research', href: '/research' },
    { label: 'Investors', href: '/investors' },
    { label: 'Contact', href: '/contact' },
  ],
};
