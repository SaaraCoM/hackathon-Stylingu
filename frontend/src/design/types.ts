export type View = 'inicio' | 'color' | 'makeup' | 'armario' | 'compras';
export interface Analysis {
  analyzedAt?: string;
  source?: string;
  photos?: { face?: string; body?: string };
  colorimetry: { season: string; palette: string[]; temperature?: string; harmony?: string };
  makeup?: { look?: string; lipHex?: string };
  outfit?: { style?: string };
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
declare global { interface Window { stylinguDesign: DesignBridge; STYLINGU_API_BASE?: string } }
