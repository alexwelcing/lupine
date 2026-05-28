/**
 * Helpers for high-quality equirectangular panorama textures.
 *
 * Equirectangular maps stretch heavily near the poles, so naive
 * `LinearFilter` sampling produces visible pixelation and "stretch
 * marks" — especially on mobile devices with high pixel ratios.
 * Enabling mipmaps with trilinear filtering and the GPU's max
 * anisotropy makes the panorama look crisp at any viewing angle.
 */

import * as THREE from 'three';

/** Aspect ratio expected by EquirectangularReflectionMapping. */
const EQUIRECT_ASPECT = 2;

/**
 * Apply high-quality sampling settings for use as an equirectangular
 * panorama background. Safe to call on a texture that has already
 * been uploaded — sets `needsUpdate` so the GPU re-uploads with the
 * new mipmap/filter settings.
 */
export function configureEquirectTexture(
  texture: THREE.Texture,
  renderer?: THREE.WebGLRenderer,
): THREE.Texture {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * Build a 2:1 canvas gradient texture sized to match the
 * equirectangular projection so the gradient stops align correctly
 * with the horizon/zenith.
 */
export function createGradientEquirectTexture(
  top: string,
  bottom: string,
  renderer?: THREE.WebGLRenderer,
  height = 1024,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = height * EQUIRECT_ASPECT;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  configureEquirectTexture(texture, renderer);
  return texture;
}
