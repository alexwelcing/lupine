import { describe, expect, it } from 'vitest';
import {
  buildMissingViewShareModel,
  buildSavedViewShareModel,
  renderSavedViewShareHtml,
  savedViewSlugFromRequestPath,
} from './socialMeta';

describe('savedViewSlugFromRequestPath', () => {
  it('extracts and normalizes the path slug', () => {
    expect(savedViewSlugFromRequestPath('/view/Ice%20Block%20Publish')).toBe('ice-block-publish');
  });

  it('rejects non-view routes and invalid encodings', () => {
    expect(savedViewSlugFromRequestPath('/')).toBeNull();
    expect(savedViewSlugFromRequestPath('/view/%E0%A4%A')).toBeNull();
  });
});

describe('buildSavedViewShareModel', () => {
  it('builds crawler-friendly social metadata from a saved view', () => {
    const model = buildSavedViewShareModel('cuzr-melt', {
      title: 'CuZr Melt Publish',
      slug: 'cuzr-melt',
      visibility: 'public',
      molecule: {
        name: 'CuZr_melt.lammpstrj',
        atomCount: 12000,
        totalFrames: 80,
      },
    });

    expect(model.shareUrl).toBe('https://lupi.live/view/cuzr-melt');
    expect(model.appUrl).toBe('https://lupi.live/#/view/cuzr-melt');
    expect(model.imageUrl).toBe('https://lupi.live/og-lupi.png');
    expect(model.description).toContain('12,000 atoms');
    expect(model.description).toContain('80 frames');
  });

  it('sanitizes user-authored text before rendering HTML', () => {
    const model = buildSavedViewShareModel('bad-title', {
      title: '<script>alert(1)</script>',
      slug: 'bad-title',
      visibility: 'public',
      molecule: { name: 'demo.xyz', atomCount: 4, totalFrames: 1 },
    });
    const html = renderSavedViewShareHtml(model);

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('marks missing views noindex', () => {
    const model = buildMissingViewShareModel('missing-view');
    expect(model.robots).toContain('noindex');
    expect(renderSavedViewShareHtml(model, false)).not.toContain('window.location.replace');
  });
});
