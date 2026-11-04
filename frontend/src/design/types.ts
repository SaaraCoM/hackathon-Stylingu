import type { StylingThemeMode } from './profile-image-pipeline';

export type View = 'inicio' | 'color' | 'makeup' | 'armario' | 'compras';
export type StudioSubTab = 'results' | 'similar' | 'collage';

export interface Analysis {
  analyzedAt?: string;
  source?: string;
  analysisId?: string;
  schemaVersion?: number;
  profileVersion?: number;
  visualVersion?: number;
  photos?: { face?: string; body?: string; garments?: string[] };
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
  outfits?: {
    top: string;
    topDesc?: string;
    bottom: string;
    bottomDesc?: string;
    jacket: string;
    jacketDesc?: string;
    acc: string;
    accDesc?: string;
  }[];
  observed?: {
    hairColor?: string;
    eyeColor?: string;
    eyelid?: string;
    depth?: string;
    uncertain?: string[];
  };
  notes?: string[];
}

export interface DeclaredProfileData {
  hairColor?: string;
  dyedHair?: boolean | null;
  eyeColor?: string;
  eyelid?: string;
  style?: string;
  finish?: string;
  intensity?: string;
  budget?: number | null;
  currency?: string;
  skinType?: string;
  brands?: string[];
  restrictions?: string[];
}

export interface AccountProfileData {
  name: string;
  email?: string;
  handle?: string;
  version: number;
  visualVersion: number;
  declared: DeclaredProfileData;
  goals?: string[];
  jewelry?: string;
  styles?: string[];
}

export interface AccountPermissions {
  canEditProfile: boolean;
  canUploadPhotos: boolean;
  canExportDossier: boolean;
  canImportDossier: boolean;
  canScanProducts: boolean;
  canCompareAccounts: boolean;
}

export interface GarmentItem {
  _id: string;
  name: string;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';
  colors: string[];
  season?: string[];
  occasions?: string[];
  available: boolean;
}

export interface OutfitPlanItem {
  date: string;
  labels: string[];
  colors: string[];
  status: string;
  profileVersion: number;
  explanation?: string;
}

export interface CatalogVariantItem {
  _id: string;
  shade: string;
  market: string;
  finish?: string;
  colorVerified?: boolean;
  hex?: string;
  source?: string;
  product?: {
    _id?: string;
    brand: string;
    name: string;
    category?: string;
  };
}

export interface TutorialItem {
  id: string;
  title: string;
  duration: number;
  difficulty: string;
  intensity: string;
  goal?: string;
  occasion?: string;
  zone?: string;
  materials: string[];
  categories: string[];
  steps: string[];
  adaptations?: string;
  alternative?: string;
  profileVersion?: number;
  analysisId?: string;
}

export interface AccountNetworkBundle {
  loading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  capabilities: { configured: boolean; provider?: string } | null;
  garments: GarmentItem[];
  plans: OutfitPlanItem[];
  catalog: CatalogVariantItem[];
  tutorials: TutorialItem[];
}

export interface AccountSlot {
  accountId: string;
  profileData: AccountProfileData;
  permissions: AccountPermissions;
  theme: StylingThemeMode;
  analysis: Analysis | null;
  network: AccountNetworkBundle;
  isComparisonPeer?: boolean;
}

export interface Snapshot {
  analysis: Analysis | null;
  name: string;
  accountId?: string;
  profile?: { version?: number; visualVersion?: number; declared?: DeclaredProfileData } | null;
  garments?: GarmentItem[];
  plans?: OutfitPlanItem[];
  catalog?: CatalogVariantItem[];
  tutorials?: TutorialItem[];
  fileVersion?: string;
}

export interface DesignBridge {
  snapshot(): Snapshot;
  subscribe(callback: () => void): () => void;
  navigate(view: View): void;
  account(): void;
  consultation(): void;
  scanner(): void;
  notify(message: string): void;
}

declare global {
  interface Window {
    stylinguDesign: DesignBridge;
    stylinguInstall?: { available: () => boolean; prompt: () => Promise<boolean> };
    STYLINGU_API_BASE?: string;
    STYLINGU_FILE_SPEC?: {
      version: string;
      schemaVersion: number;
      badge: string;
      label: string;
      acceptedTypes: string[];
      maxBytes: number;
      maxPixels: number;
    };
    STYLINGU_POSTHOG?: { key?: string; host?: string };
    stylinguAnalytics?: {
      consent: () => 'granted' | 'denied' | 'unset';
      configured: () => boolean;
      recording: () => boolean;
    };
  }
}
