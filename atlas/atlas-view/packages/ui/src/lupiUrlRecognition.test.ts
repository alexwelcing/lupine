import { describe, expect, it } from 'vitest';
import { recognizeLupiUrlPayload } from './lupiUrlRecognition';

describe('recognizeLupiUrlPayload', () => {
  it('recognizes Lupi load links from QR scanner wrapper text', () => {
    const intent = recognizeLupiUrlPayload(
      'URL: <https://lupi.live/?load=https%3A%2F%2Fcdn.example.org%2Fgallery%2Fwater_cluster.xyz>',
    );

    expect(intent).toMatchObject({
      kind: 'loadUrl',
      url: 'https://cdn.example.org/gallery/water_cluster.xyz',
    });
  });

  it('recognizes load params embedded in hash query strings', () => {
    const intent = recognizeLupiUrlPayload(
      'https://lupi.live/#/mcp?load=https%3A%2F%2Fstorage.googleapis.com%2Fshed%2Fsample.glimbin',
    );

    expect(intent).toMatchObject({
      kind: 'loadUrl',
      url: 'https://storage.googleapis.com/shed/sample.glimbin',
    });
  });

  it('preserves nested molecule URL query strings inside load params', () => {
    const intent = recognizeLupiUrlPayload(
      'https://lupi.live/?load=https%3A%2F%2Fexample.org%2Fmol.xyz%3Falt%3Dmedia%26token%3Dabc',
    );

    expect(intent).toMatchObject({
      kind: 'loadUrl',
      url: 'https://example.org/mol.xyz?alt=media&token=abc',
    });
  });

  it('recognizes canonical saved-view hash URLs', () => {
    const intent = recognizeLupiUrlPayload('lupi.live/#/view/Ice Block Publish');

    expect(intent).toMatchObject({
      kind: 'savedView',
      slug: 'ice-block-publish',
    });
  });

  it('recognizes path-style saved-view URLs for QR clients that drop fragments', () => {
    const intent = recognizeLupiUrlPayload('https://lupi.live/view/caffeine-publish');

    expect(intent).toMatchObject({
      kind: 'savedView',
      slug: 'caffeine-publish',
    });
  });

  it('recognizes raw molecule file URLs as direct load URLs', () => {
    const intent = recognizeLupiUrlPayload(
      'Scanned: https://example.org/molecules/caffeine.xyz?download=1.',
    );

    expect(intent).toMatchObject({
      kind: 'loadUrl',
      url: 'https://example.org/molecules/caffeine.xyz?download=1',
    });
  });

  it('preserves scene and flythrough params on recognized viewer URLs', () => {
    const intent = recognizeLupiUrlPayload('https://lupi.live/?s=abc&fly=def');

    expect(intent).toMatchObject({
      kind: 'viewerState',
      state: 'abc',
      fly: 'def',
    });
  });
});
