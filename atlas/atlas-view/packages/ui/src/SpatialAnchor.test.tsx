import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useXR } from '@react-three/xr';
import { SpatialAnchor } from './SpatialAnchor';

vi.mock('@react-three/xr', () => {
  return {
    useXR: vi.fn((selector) => {
      const mockState = { mode: 'inline' };
      return selector ? selector(mockState) : mockState;
    })
  };
});

vi.mock('./xr/XRMoleculeInteraction', () => ({
  XRMoleculeInteraction: ({ children }: any) => <group data-testid="xr-interaction">{children}</group>
}));
vi.mock('./xr/XRControlPanel', () => ({
  XRControlPanel: () => <group data-testid="xr-panel" />
}));
vi.mock('@react-three/drei', () => ({
  Text: ({ children }: any) => <group data-testid="drei-text">{children}</group>,
  ContactShadows: () => <group data-testid="drei-shadows" />
}));
vi.mock('./store', () => ({
  useStore: vi.fn((selector) => selector({ file: { name: 'test-molecule.xyz' } }))
}));

// Provide a mock group since we are testing outside a Canvas for the DOM assertions
vi.mock('react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    // intercept lowercase three elements (R3F) for DOM testing
  };
});

// For pure DOM testing of R3F components wrapped in providers, it's easier to mock out Three elements.
// Or we can use react-three-test-renderer
import ReactThreeTestRenderer from '@react-three/test-renderer';

describe('SpatialAnchor (Contexts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard 2D view (mode: inline)', async () => {
    // Default mock is inline
    const renderer = await ReactThreeTestRenderer.create(
      <SpatialAnchor>
        <mesh data-testid="test-child" />
      </SpatialAnchor>
    );

    const scene = renderer.scene;
    const child = scene.findByProps({ 'data-testid': 'test-child' });
    expect(child).toBeDefined();

    // In inline mode, the XR interaction and UI are NOT rendered inside the anchor.
    // They are replaced by just the children.
    expect(() => scene.findByProps({ 'data-testid': 'xr-interaction' })).toThrow();
  });

  it('renders Immersive AR context with correct scaling and grounding', async () => {
    // Override the mock for this test
    vi.mocked(useXR).mockImplementation((selector: any) => selector({ mode: 'immersive-ar' }));

    const renderer = await ReactThreeTestRenderer.create(
      <SpatialAnchor cameraDistance={50}>
        <mesh data-testid="test-child" />
      </SpatialAnchor>
    );

    const scene = renderer.scene;
    
    // Test that the XR wrapper is present
    const xrWrapper = scene.findByProps({ 'data-testid': 'xr-interaction' });
    expect(xrWrapper).toBeDefined();

    // Ensure the inner group has been scaled down for AR (scale ~ 0.028)
    const scaleGroup = xrWrapper.children[0];
    expect(scaleGroup.props.scale).toBeLessThan(1.0);
    expect(scaleGroup.props.scale).toBeGreaterThan(0.01);

    // Verify grounding shadows
    const shadow = scene.findByProps({ 'data-testid': 'drei-shadows' });
    expect(shadow).toBeDefined();

    // Verify contextual labeling
    const label = scene.findByProps({ 'data-testid': 'drei-text' });
    expect(label).toBeDefined();
  });

  it('renders Immersive VR context identical to AR scaling', async () => {
    vi.mocked(useXR).mockImplementation((selector: any) => selector({ mode: 'immersive-vr' }));

    const renderer = await ReactThreeTestRenderer.create(
      <SpatialAnchor>
        <mesh data-testid="test-child" />
      </SpatialAnchor>
    );

    const scene = renderer.scene;
    expect(scene.findByProps({ 'data-testid': 'xr-interaction' })).toBeDefined();
    
    // Default cameraDistance is 50, scale should be ~0.028
    const scaleGroup = scene.findByProps({ 'data-testid': 'xr-interaction' }).children[0];
    expect(scaleGroup.props.scale).toBeLessThan(1.0);
  });
});
