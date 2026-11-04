export type View = 'inicio' | 'color' | 'makeup' | 'armario' | 'compras';
export interface Analysis {
  analyzedAt?: string;
  source?: string;
  photos?: { face?: string; body?: string };
  colorimetry: {
    season: string;
    palette: string[];
    temperature?: string;
    contrast?: string;
    chroma?: string;
    harmony?: number | string;
    primaryHex?: string;
    avoid?: { name: string; hex: string; why?: string; alt?: string }[];
  };
  makeup?: {
    look?: string;
    lipHex?: string;
    blushHex?: string;
    faceShape?: string;
    eyeShape?: string;
    eyelinerType?: string;
    shadowPlacement?: string;
    blushPlacement?: string;
    applicationSteps?: string[];
  };
  outfit?: { style?: string; silhouette?: string; accent?: string };
  outfits?: { top: string; bottom: string; jacket: string; acc: string }[];
}
export interface Snapshot { analysis: Analysis | null; name: string; accountId?: string }
export interface DesignBridge {
  snapshot(): Snapshot;
  subscribe(callback: () => void): () => void;
  navigate(view: View): void;
  account(): void;
  consultation(): void;
  scanner(): void;
  notify(message: string): void;
}
declare global { interface Window { stylinguDesign: DesignBridge; stylinguInstall?: { available: () => boolean; prompt: () => Promise<boolean> }; STYLINGU_API_BASE?: string; STYLINGU_POSTHOG?: { key?: string; host?: string }; stylinguAnalytics?: { consent: () => 'granted' | 'denied' | 'unset'; configured: () => boolean; recording: () => boolean } } }
