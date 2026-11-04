import { privatePhoto } from './media';
import { REQUIRED_FILE_VERSION } from './file-version';

export type ProfileImagePreset = 'avatar-square' | 'wheel-portrait' | 'mypage-card';
export type StylingThemeMode = 'editorial' | 'studio';

export interface ProfileStyleOptions {
  accountId: string;
  preset?: ProfileImagePreset;
  theme?: StylingThemeMode;
  accentHex?: string;
  warmthBias?: number;
}

export interface StylizedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: '1:1' | '4:5';
  fileVersion: string;
  accountId: string;
  styledAt: string;
  fromFallback: boolean;
}

interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Pipeline orientado a objetos para la edición, normalización y estilizado
 * de imágenes de perfil. Ninguna foto de perfil se renderiza en crudo:
 * todas pasan por recorte inteligente, normalización lumínica y acabado estético.
 */
export class ProfileImagePipeline {
  private readonly cache: Map<string, Promise<StylizedImageResult>>;
  private readonly maxCacheEntries: number;

  constructor(maxCacheEntries: number = 24) {
    this.cache = new Map<string, Promise<StylizedImageResult>>();
    this.maxCacheEntries = maxCacheEntries;
  }

  public computeSmartCrop(
    sourceWidth: number,
    sourceHeight: number,
    targetAspect: number,
    verticalFocus: number = 0.38
  ): CropRect {
    const safeWidth = Math.max(1, sourceWidth);
    const safeHeight = Math.max(1, sourceHeight);
    const currentAspect = safeWidth / safeHeight;

    let sw = safeWidth;
    let sh = safeHeight;

    if (currentAspect > targetAspect) {
      sw = Math.max(1, Math.round(safeHeight * targetAspect));
    } else if (currentAspect < targetAspect) {
      sh = Math.max(1, Math.round(safeWidth / targetAspect));
    }

    const sx = Math.max(0, Math.round((safeWidth - sw) * 0.5));
    const clampedFocus = Math.max(0, Math.min(1, verticalFocus));
    const sy = Math.max(0, Math.min(safeHeight - sh, Math.round((safeHeight - sh) * clampedFocus)));

    return { sx, sy, sw, sh };
  }

  public normalizeAndGradePixels(
    pixels: Uint8ClampedArray,
    theme: StylingThemeMode = 'editorial',
    warmthBias: number = 1
  ): void {
    const length = pixels.length;
    if (length < 4) return;

    let lumSum = 0;
    let minLum = 255;
    let maxLum = 0;
    const sampleStep = Math.max(4, Math.floor(length / 4096) * 4);
    let samples = 0;

    for (let i = 0; i < length; i += sampleStep) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumSum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      samples += 1;
    }

    const meanLum = samples > 0 ? lumSum / samples : 128;
    const dynamicRange = Math.max(40, maxLum - minLum);
    const contrastScale = Math.min(1.18, Math.max(0.96, 210 / dynamicRange));
    const brightnessShift = Math.max(-18, Math.min(22, (134 - meanLum) * 0.35));

    const rTint = theme === 'studio' ? 3 * warmthBias : 6 * warmthBias;
    const gTint = theme === 'studio' ? 1 * warmthBias : 2 * warmthBias;
    const bTint = theme === 'studio' ? 5 : -3 * warmthBias;

    for (let i = 0; i < length; i += 4) {
      const r0 = pixels[i];
      const g0 = pixels[i + 1];
      const b0 = pixels[i + 2];

      const r1 = (r0 - 128) * contrastScale + 128 + brightnessShift + rTint;
      const g1 = (g0 - 128) * contrastScale + 128 + brightnessShift + gTint;
      const b1 = (b0 - 128) * contrastScale + 128 + brightnessShift + bTint;

      pixels[i] = r1 < 0 ? 0 : r1 > 255 ? 255 : Math.round(r1);
      pixels[i + 1] = g1 < 0 ? 0 : g1 > 255 ? 255 : Math.round(g1);
      pixels[i + 2] = b1 < 0 ? 0 : b1 > 255 ? 255 : Math.round(b1);
    }
  }

  public buildStylizedFallback(
    initials: string,
    options: ProfileStyleOptions
  ): StylizedImageResult {
    const preset = options.preset || 'avatar-square';
    const isCard = preset === 'mypage-card';
    const width = isCard ? 400 : 256;
    const height = isCard ? 500 : 256;
    const accent = /^#[0-9a-f]{6}$/i.test(options.accentHex || '')
      ? options.accentHex!
      : options.theme === 'studio'
        ? '#7C3AED'
        : '#B4655C';
    const secondary = options.theme === 'studio' ? '#DDD6FE' : '#F2E4DF';
    const bg = options.theme === 'studio' ? '#F5F3FF' : '#FBF6EF';
    const safeInitials = (initials || 'S').trim().slice(0, 2).toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <radialGradient id="g" cx="35%" cy="28%" r="75%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"/>
          <stop offset="55%" stop-color="${secondary}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.28"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="${isCard ? 28 : 128}" fill="${bg}"/>
      <rect width="${width}" height="${height}" rx="${isCard ? 28 : 128}" fill="url(#g)"/>
      <circle cx="${width / 2}" cy="${height * 0.42}" r="${Math.min(width, height) * 0.22}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.45"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="${Math.round(width * 0.32)}" fill="${accent}">${safeInitials}</text>
    </svg>`;

    const encoded = typeof btoa === 'function'
      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
      : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return {
      dataUrl: encoded,
      width,
      height,
      aspectRatio: isCard ? '4:5' : '1:1',
      fileVersion: REQUIRED_FILE_VERSION,
      accountId: options.accountId || 'guest',
      styledAt: new Date().toISOString(),
      fromFallback: true
    };
  }

  public async processProfileImage(
    rawPhotoPathOrDataUrl: string | undefined,
    initials: string,
    options: ProfileStyleOptions,
    apiBase: string = ''
  ): Promise<StylizedImageResult> {
    const preset = options.preset || 'avatar-square';
    const theme = options.theme || 'editorial';
    const resolvedUrl = rawPhotoPathOrDataUrl?.startsWith('data:image/')
      ? rawPhotoPathOrDataUrl
      : privatePhoto(rawPhotoPathOrDataUrl, apiBase);

    if (!resolvedUrl || typeof document === 'undefined') {
      return this.buildStylizedFallback(initials, options);
    }

    const cacheKey = `${options.accountId || 'guest'}:${preset}:${theme}:${options.accentHex || ''}:${resolvedUrl.slice(0, 120)}`;
    const existing = this.cache.get(cacheKey);
    if (existing) {
      return existing;
    }

    const task = this.renderStylizedCanvas(resolvedUrl, initials, options).catch(() =>
      this.buildStylizedFallback(initials, options)
    );

    this.cache.set(cacheKey, task);
    if (this.cache.size > this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey && oldestKey !== cacheKey) {
        this.cache.delete(oldestKey);
      }
    }
    return task;
  }

  public clearAccountCache(accountId?: string): void {
    if (!accountId) {
      this.cache.clear();
      return;
    }
    const prefix = `${accountId}:`;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  private async renderStylizedCanvas(
    resolvedUrl: string,
    initials: string,
    options: ProfileStyleOptions
  ): Promise<StylizedImageResult> {
    const preset = options.preset || 'avatar-square';
    const theme = options.theme || 'editorial';
    const isCard = preset === 'mypage-card';
    const targetWidth = isCard ? 480 : 320;
    const targetHeight = isCard ? 600 : 320;
    const targetAspect = targetWidth / targetHeight;

    const image = await this.loadImageElement(resolvedUrl);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) {
      return this.buildStylizedFallback(initials, options);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return this.buildStylizedFallback(initials, options);
    }

    const crop = this.computeSmartCrop(
      naturalWidth,
      naturalHeight,
      targetAspect,
      isCard ? 0.32 : 0.36
    );

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = theme === 'studio' ? '#F5F3FF' : '#FBF6EF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      targetWidth,
      targetHeight
    );

    try {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      this.normalizeAndGradePixels(imageData.data, theme, options.warmthBias ?? 1);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Si el entorno restringe getImageData (p.ej. canvas sin soporte en test), aplicamos overlay vectorial
    }

    // Viñeteado suave de estudio y anillo interior sutil
    const gradient = ctx.createRadialGradient(
      targetWidth * 0.5,
      targetHeight * 0.42,
      targetWidth * 0.24,
      targetWidth * 0.5,
      targetHeight * 0.5,
      targetWidth * 0.72
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    gradient.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(
      1,
      theme === 'studio' ? 'rgba(76, 29, 149, 0.16)' : 'rgba(55, 42, 34, 0.16)'
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const accent = /^#[0-9a-f]{6}$/i.test(options.accentHex || '')
      ? options.accentHex!
      : theme === 'studio'
        ? '#7C3AED'
        : '#B4655C';

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = isCard ? 4 : 3;
    ctx.strokeRect(1.5, 1.5, targetWidth - 3, targetHeight - 3);
    ctx.globalAlpha = 1;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return {
      dataUrl,
      width: targetWidth,
      height: targetHeight,
      aspectRatio: isCard ? '4:5' : '1:1',
      fileVersion: REQUIRED_FILE_VERSION,
      accountId: options.accountId || 'guest',
      styledAt: new Date().toISOString(),
      fromFallback: false
    };
  }

  private async loadImageElement(src: string): Promise<HTMLImageElement> {
    if (src.startsWith('data:')) {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    }
    const response = await fetch(src, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('No se pudo cargar la foto de perfil.');
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export const defaultProfileImagePipeline = new ProfileImagePipeline();
