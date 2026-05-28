import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { BgMedia } from '../backgroundPresets';
import {
  configureEquirectDomeTexture,
  configureEquirectTexture,
  configureEquirectVideoTexture,
  createGradientEquirectTexture,
  type BackgroundGradientStyle,
} from '../equirectTexture';

type UseEquirectMediaTextureArgs = {
  media: BgMedia;
  top: string;
  bottom: string;
  style?: BackgroundGradientStyle;
  enabled?: boolean;
  logPrefix?: string;
  projection?: 'scene-background' | 'dome';
};

type VideoFrameCallback = (now: number, metadata: unknown) => void;
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: VideoFrameCallback) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function getEquirectMediaKey(media: BgMedia): string {
  if (media.kind === 'gradient') return 'gradient';
  if (media.kind === 'image') return `image:${media.src}`;
  return `video:${media.sources.map(source => `${source.type ?? 'auto'}:${source.src}`).join('|')}`;
}

function selectVideoSource(media: Extract<BgMedia, { kind: 'video' }>): string | null {
  if (media.sources.length === 0) return null;
  const probe = document.createElement('video');
  const playable = media.sources.filter(source => !source.type || probe.canPlayType(source.type));
  const candidates = playable.length > 0 ? playable : media.sources;
  const targetWidth = window.innerWidth * Math.max(1, window.devicePixelRatio || 1);
  const sizedCandidates = candidates
    .filter(source => typeof source.width === 'number')
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const matched = sizedCandidates.find(source => (source.width ?? 0) >= targetWidth);
  return (matched ?? sizedCandidates[sizedCandidates.length - 1] ?? candidates[0]).src;
}

export function useEquirectMediaTexture({
  media,
  top,
  bottom,
  style = 'linear',
  enabled = true,
  logPrefix = 'bg',
  projection = 'scene-background',
}: UseEquirectMediaTextureArgs): THREE.Texture | null {
  const { gl, invalidate } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const activeVideoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaKey = useMemo(() => getEquirectMediaKey(media), [media]);
  const mediaForEffect = useMemo(() => media, [mediaKey]);

  useFrame(() => {
    const videoTexture = activeVideoTextureRef.current;
    const video = activeVideoRef.current;
    if (!videoTexture || !video || video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    videoTexture.needsUpdate = true;
  });

  useEffect(() => {
    let active = true;
    let ownedTexture: THREE.Texture | null = null;
    let video: HTMLVideoElement | null = null;
    let videoFrameCallbackId: number | null = null;
    let videoFrameTimerId: number | null = null;

    setTexture(null);
    activeVideoTextureRef.current = null;
    activeVideoRef.current = null;

    const stopVideoInvalidation = () => {
      if (videoFrameCallbackId !== null && video) {
        (video as VideoWithFrameCallback).cancelVideoFrameCallback?.(videoFrameCallbackId);
        videoFrameCallbackId = null;
      }
      if (videoFrameTimerId !== null) {
        window.clearTimeout(videoFrameTimerId);
        videoFrameTimerId = null;
      }
    };

    const scheduleVideoInvalidation = (videoTexture: THREE.VideoTexture, videoElement: HTMLVideoElement) => {
      if (!active) return;
      videoTexture.needsUpdate = true;
      invalidate();

      const frameVideo = videoElement as VideoWithFrameCallback;
      if (frameVideo.requestVideoFrameCallback) {
        videoFrameCallbackId = frameVideo.requestVideoFrameCallback(() => {
          scheduleVideoInvalidation(videoTexture, videoElement);
        });
      } else {
        const fps = mediaForEffect.kind === 'video' ? mediaForEffect.fps ?? 24 : 24;
        videoFrameTimerId = window.setTimeout(() => {
          scheduleVideoInvalidation(videoTexture, videoElement);
        }, Math.max(16, Math.round(1000 / fps)));
      }
    };

    const setOwnedTexture = (nextTexture: THREE.Texture) => {
      if (!active) {
        nextTexture.dispose();
        return;
      }
      const previousTexture = ownedTexture;
      ownedTexture = nextTexture;
      setTexture(nextTexture);
      if (previousTexture === activeVideoTextureRef.current) {
        activeVideoTextureRef.current = null;
        activeVideoRef.current = null;
        stopVideoInvalidation();
      }
      if (previousTexture && previousTexture !== nextTexture) {
        previousTexture.dispose();
      }
    };

    const configureStaticTexture = (nextTexture: THREE.Texture) => {
      if (projection === 'dome') {
        return configureEquirectDomeTexture(nextTexture, gl);
      }
      return configureEquirectTexture(nextTexture, gl);
    };

    const configureVideoTexture = (nextTexture: THREE.VideoTexture) => {
      if (projection === 'dome') {
        return configureEquirectDomeTexture(nextTexture, gl) as THREE.VideoTexture;
      }
      return configureEquirectVideoTexture(nextTexture, gl);
    };

    const createFallbackGradient = () => {
      const gradientTexture = createGradientEquirectTexture(top, bottom, gl, 1024, style);
      if (projection === 'dome') {
        configureEquirectDomeTexture(gradientTexture, gl);
      }
      return gradientTexture;
    };

    if (!enabled) {
      return () => {
        active = false;
      };
    }

    if (mediaForEffect.kind === 'gradient') {
      setOwnedTexture(createFallbackGradient());
    } else if (mediaForEffect.kind === 'image') {
      const loader = new THREE.TextureLoader();
      loader.load(
        mediaForEffect.src,
        loadedTexture => {
          configureStaticTexture(loadedTexture);
          setOwnedTexture(loadedTexture);
        },
        undefined,
        () => {
          if (!active) return;
          console.warn(`[${logPrefix}] Failed to load texture: ${mediaForEffect.src}, falling back to gradient`);
          setOwnedTexture(createFallbackGradient());
        },
      );
    } else {
      const source = selectVideoSource(mediaForEffect);
      if (!source) {
        console.warn(`[${logPrefix}] Video background has no playable source, falling back to gradient`);
        setOwnedTexture(createFallbackGradient());
      } else {
        let videoReady = false;
        let pendingVideoTexture: THREE.VideoTexture | null = null;

        const fallbackToGradient = () => {
          if (!active || ownedTexture) return;
          setOwnedTexture(createFallbackGradient());
        };

        if (mediaForEffect.poster) {
          const loader = new THREE.TextureLoader();
          loader.load(
            mediaForEffect.poster,
            loadedTexture => {
              if (videoReady) {
                loadedTexture.dispose();
                return;
              }
              configureStaticTexture(loadedTexture);
              setOwnedTexture(loadedTexture);
            },
            undefined,
            fallbackToGradient,
          );
        }

        video = document.createElement('video');
        video.src = source;
        video.loop = mediaForEffect.loop ?? true;
        video.muted = mediaForEffect.muted ?? true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.preload = mediaForEffect.preload ?? 'auto';
        video.poster = mediaForEffect.poster ?? '';

        const promoteVideoTexture = () => {
          if (!active || !video) return;
          videoReady = true;
          pendingVideoTexture = configureVideoTexture(new THREE.VideoTexture(video));
          activeVideoTextureRef.current = pendingVideoTexture;
          activeVideoRef.current = video;
          setOwnedTexture(pendingVideoTexture);
          video.play()
            .then(() => {
              if (active && pendingVideoTexture && video) scheduleVideoInvalidation(pendingVideoTexture, video);
            })
            .catch(error => {
              if (active) console.warn(`[${logPrefix}] Video background autoplay prevented:`, error);
            });
        };

        const handleVideoError = () => {
          if (active) console.warn(`[${logPrefix}] Failed to load video texture: ${source}`);
          fallbackToGradient();
        };

        video.addEventListener('loadeddata', promoteVideoTexture, { once: true });
        video.addEventListener('error', handleVideoError, { once: true });
        video.load();
      }
    }

    return () => {
      active = false;
      stopVideoInvalidation();
      setTexture(current => (current === ownedTexture ? null : current));
      if (ownedTexture === activeVideoTextureRef.current) {
        activeVideoTextureRef.current = null;
        activeVideoRef.current = null;
      }
      ownedTexture?.dispose();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [bottom, enabled, gl, invalidate, logPrefix, mediaForEffect, mediaKey, projection, style, top]);

  return texture;
}
