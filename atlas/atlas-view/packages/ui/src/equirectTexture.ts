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

export type BackgroundGradientStyle = 'linear' | 'radial' | 'spotlight';

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
 * Video textures cannot use generated mipmaps in the same way static images do,
 * but they still need the same projection, wrap, and color-space contract as
 * still panoramas.
 */
export function configureEquirectVideoTexture(
  texture: THREE.VideoTexture,
  renderer?: THREE.WebGLRenderer,
): THREE.VideoTexture {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (renderer) {
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * Apply sampling settings for a 2:1 panorama that will be drawn on an inverted
 * sphere mesh. This keeps animated panoramas out of Three's scene-background
 * cache path and lets video frames advance through a normal material map.
 */
export function configureEquirectDomeTexture(
  texture: THREE.Texture,
  renderer?: THREE.WebGLRenderer,
): THREE.Texture {
  texture.mapping = THREE.UVMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  if (texture instanceof THREE.VideoTexture) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
  } else {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
  }
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
  style: BackgroundGradientStyle = 'linear',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = height * EQUIRECT_ASPECT;
  const ctx = canvas.getContext('2d')!;

  let grad: CanvasGradient;
  if (style === 'radial') {
    grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.height / 1.5,
    );
  } else if (style === 'spotlight') {
    grad = ctx.createRadialGradient(
      canvas.width / 2,
      0,
      0,
      canvas.width / 2,
      0,
      canvas.height / 1.2,
    );
  } else {
    grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  }

  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  configureEquirectTexture(texture, renderer);
  return texture;
}
