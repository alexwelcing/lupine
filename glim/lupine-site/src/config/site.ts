export const site = {
  name: 'Lupine',
  legalName: 'Lupine Materials Science',
  tagline: 'Verification infrastructure for the MLIP transition.',
  description:
    'Lupine helps materials teams move from historical molecular dynamics to machine-learned interatomic potentials without carrying forward hidden scientific failure modes.',
  url: 'https://lupine.science',
  viewerUrl: 'https://viewer.lupine.science',
  contactEmail: 'founders@lupine.science',
  github: 'https://github.com/lupine-science',
  foundedYear: 2024,
  ogImage: '/og-default.png',
  themeColor: '#0a0b12',
} as const;

export type SiteConfig = typeof site;
