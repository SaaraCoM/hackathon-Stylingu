import type {
  Analysis,
  CatalogVariantItem,
  DeclaredProfileData,
  GarmentItem,
  OutfitPlanItem,
  TutorialItem
} from './types';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export interface HydratedAccountData {
  profile: { version: number; visualVersion: number; declared: DeclaredProfileData } | null;
  preferences: { goals?: string[]; jewelry?: string; styles?: string[] } | null;
  analysis: Analysis | null;
  garments: GarmentItem[];
  plans: OutfitPlanItem[];
  catalog: CatalogVariantItem[];
  tutorials: TutorialItem[];
  capabilities: { configured: boolean; provider?: string } | null;
}

export interface PurchaseRecommendationResponse {
  state: string;
  label: string;
  reasons: string[];
  profileVersion?: number;
}

/**
 * Cliente HTTP orientado a objetos para la capa de red de StylingU.
 * Aísla caché y controladores de cancelación (AbortController) por accountId
 * para evitar fugas de estado o colisiones en cambios rápidos de cuenta.
 */
export class StylingApiClient {
  private readonly baseUrl: string;
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private readonly controllersByAccount: Map<string, Set<AbortController>>;
  private readonly cacheTtlMs: number;

  constructor(baseUrl: string = '', cacheTtlMs: number = 45_000) {
    this.baseUrl = baseUrl;
    this.cache = new Map<string, CacheEntry<unknown>>();
    this.controllersByAccount = new Map<string, Set<AbortController>>();
    this.cacheTtlMs = cacheTtlMs;
  }

  public abortAccountRequests(accountId: string): void {
    const controllers = this.controllersByAccount.get(accountId);
    if (!controllers) return;
    for (const controller of controllers) {
      controller.abort();
    }
    controllers.clear();
  }

  public abortAllRequests(): void {
    for (const [accountId] of this.controllersByAccount) {
      this.abortAccountRequests(accountId);
    }
  }

  public invalidateAccountCache(accountId: string): void {
    const prefix = `${accountId}::`;
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  public async requestJson<T>(
    accountId: string,
    path: string,
    options: RequestInit & { useCache?: boolean; timeoutMs?: number } = {}
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = `${accountId}::${method}::${path}`;

    if (method === 'GET' && options.useCache !== false) {
      const hit = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
      if (hit && Date.now() - hit.timestamp < this.cacheTtlMs) {
        return hit.value;
      }
    }

    const controller = new AbortController();
    this.registerController(accountId, controller);
    const timeoutMs = options.timeoutMs ?? (path.includes('/personal/') || path.includes('/scans') ? 125_000 : 20_000);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([controller.signal, timeoutSignal, options.signal])
      : AbortSignal.any([controller.signal, timeoutSignal]);

    try {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && method !== 'GET' && method !== 'HEAD') {
        headers.set('Content-Type', 'application/json');
      }
      const apiBase = this.baseUrl || (typeof window !== 'undefined' ? window.STYLINGU_API_BASE || '' : '');
      const response = await fetch(`${apiBase}/api${path}`, {
        credentials: 'include',
        ...options,
        method,
        headers,
        signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof body?.error === 'string' ? body.error : `Error de red (${response.status})`;
        throw new Error(message);
      }
      if (method === 'GET') {
        this.cache.set(cacheKey, { value: body as T, timestamp: Date.now() });
      } else {
        this.invalidateAccountCache(accountId);
      }
      return body as T;
    } finally {
      this.unregisterController(accountId, controller);
    }
  }

  public async fetchAccountBundle(accountId: string, forceRevalidate: boolean = false): Promise<HydratedAccountData> {
    if (!accountId || accountId === 'guest' || accountId.startsWith('demo-')) {
      return {
        profile: null,
        preferences: null,
        analysis: null,
        garments: [],
        plans: [],
        catalog: [],
        tutorials: [],
        capabilities: null
      };
    }

    if (forceRevalidate) {
      this.invalidateAccountCache(accountId);
    }

    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);

    const [profileRes, authPerfilRes, garmentsRes, plansRes, catalogRes, tutorialsRes, capabilitiesRes] =
      await Promise.allSettled([
        this.requestJson<{ profile?: { version?: number; visualVersion?: number; declared?: DeclaredProfileData } }>(
          accountId,
          '/profile',
          { useCache: !forceRevalidate }
        ),
        this.requestJson<{ preferences?: { goals?: string[]; jewelry?: string; styles?: string[] }; analysis?: Analysis | null }>(
          accountId,
          '/auth/perfil',
          { useCache: !forceRevalidate }
        ),
        this.requestJson<{ items?: GarmentItem[] }>(accountId, '/garments', { useCache: !forceRevalidate }),
        this.requestJson<{ plans?: OutfitPlanItem[] }>(
          accountId,
          `/outfit-plans?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { useCache: !forceRevalidate }
        ),
        this.requestJson<{ items?: CatalogVariantItem[] }>(accountId, '/products', { useCache: !forceRevalidate }),
        this.requestJson<{ items?: TutorialItem[] }>(accountId, '/tutorials', { useCache: !forceRevalidate }),
        this.requestJson<{ configured: boolean; provider?: string }>(accountId, '/personal/capabilities', {
          useCache: !forceRevalidate
        })
      ]);

    const profileData = profileRes.status === 'fulfilled' && profileRes.value?.profile
      ? {
          version: profileRes.value.profile.version ?? 1,
          visualVersion: profileRes.value.profile.visualVersion ?? 0,
          declared: profileRes.value.profile.declared ?? {}
        }
      : null;

    const preferences = authPerfilRes.status === 'fulfilled' ? authPerfilRes.value?.preferences ?? null : null;
    const analysis = authPerfilRes.status === 'fulfilled' ? authPerfilRes.value?.analysis ?? null : null;
    const garments = garmentsRes.status === 'fulfilled' && Array.isArray(garmentsRes.value?.items)
      ? garmentsRes.value.items
      : [];
    const plans = plansRes.status === 'fulfilled' && Array.isArray(plansRes.value?.plans)
      ? plansRes.value.plans
      : [];
    const catalog = catalogRes.status === 'fulfilled' && Array.isArray(catalogRes.value?.items)
      ? catalogRes.value.items
      : [];
    const tutorials = tutorialsRes.status === 'fulfilled' && Array.isArray(tutorialsRes.value?.items)
      ? tutorialsRes.value.items
      : [];
    const capabilities = capabilitiesRes.status === 'fulfilled' ? capabilitiesRes.value : null;

    return {
      profile: profileData,
      preferences,
      analysis,
      garments,
      plans,
      catalog,
      tutorials,
      capabilities
    };
  }

  public async updateDeclaredProfile(
    accountId: string,
    patch: Partial<DeclaredProfileData>
  ): Promise<{ version: number; visualVersion: number; declared: DeclaredProfileData }> {
    const res = await this.requestJson<{
      profile: { version: number; visualVersion: number; declared: DeclaredProfileData };
    }>(accountId, '/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    return res.profile;
  }

  public async evaluateProductVariant(
    accountId: string,
    variantId: string
  ): Promise<PurchaseRecommendationResponse> {
    return this.requestJson<PurchaseRecommendationResponse>(accountId, '/purchase-recommendations', {
      method: 'POST',
      body: JSON.stringify({ variantId })
    });
  }

  private registerController(accountId: string, controller: AbortController): void {
    let set = this.controllersByAccount.get(accountId);
    if (!set) {
      set = new Set<AbortController>();
      this.controllersByAccount.set(accountId, set);
    }
    set.add(controller);
  }

  private unregisterController(accountId: string, controller: AbortController): void {
    const set = this.controllersByAccount.get(accountId);
    if (!set) return;
    set.delete(controller);
  }
}

export const defaultApiClient = new StylingApiClient();
