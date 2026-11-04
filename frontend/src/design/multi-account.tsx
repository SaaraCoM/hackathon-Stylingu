import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AccountPermissions,
  AccountProfileData,
  AccountSlot,
  Analysis,
  Snapshot
} from './types';
import { defaultApiClient, StylingApiClient } from './api-client';
import {
  defaultProfileImagePipeline,
  ProfileImagePipeline,
  type ProfileImagePreset,
  type StylingThemeMode
} from './profile-image-pipeline';
import { defaultFileSpecPolicy, REQUIRED_FILE_VERSION } from './file-version';

const COLD_COMPARISON_PALETTE = ['#28597E', '#3D7899', '#61A0BA', '#8EC2D6', '#8B4A7E', '#B84C7B'];
const WARM_DEFAULT_PALETTE = ['#D5B5AB', '#C98A7B', '#C49A45', '#865044', '#58624B'];

export function createDefaultPermissions(isAuthenticated: boolean, isPeer: boolean = false): AccountPermissions {
  return {
    canEditProfile: isAuthenticated && !isPeer,
    canUploadPhotos: isAuthenticated && !isPeer,
    canExportDossier: true,
    canImportDossier: true,
    canScanProducts: isAuthenticated,
    canCompareAccounts: true
  };
}

/**
 * Registro orientado a objetos para gestionar el aislamiento de estado entre
 * múltiples cuentas de usuario sin variables globales estáticas acopladas.
 */
export class MultiAccountRegistry {
  private readonly accounts: Map<string, AccountSlot>;
  private activeAccountId: string;
  private comparisonAccountId: string;
  private readonly apiClient: StylingApiClient;
  private readonly imagePipeline: ProfileImagePipeline;

  constructor(
    apiClient: StylingApiClient = defaultApiClient,
    imagePipeline: ProfileImagePipeline = defaultProfileImagePipeline
  ) {
    this.accounts = new Map<string, AccountSlot>();
    this.activeAccountId = 'guest';
    this.comparisonAccountId = 'peer-cold-studio';
    this.apiClient = apiClient;
    this.imagePipeline = imagePipeline;
    this.seedComparisonPeer();
  }

  public syncPrimaryFromSnapshot(snapshot: Snapshot): AccountSlot {
    const accountId = snapshot.accountId || 'guest';
    const existing = this.accounts.get(accountId);
    const previousActive = this.activeAccountId;

    if (previousActive && previousActive !== accountId && !previousActive.startsWith('peer-')) {
      this.apiClient.abortAccountRequests(previousActive);
    }

    const declared = snapshot.profile?.declared || existing?.profileData.declared || {};
    const profileData: AccountProfileData = {
      name: snapshot.name || existing?.profileData.name || 'Invitada',
      handle: `@${(snapshot.name || 'stylingu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'stylingu'}`,
      version: snapshot.profile?.version ?? snapshot.analysis?.profileVersion ?? existing?.profileData.version ?? 1,
      visualVersion:
        snapshot.profile?.visualVersion ?? snapshot.analysis?.visualVersion ?? existing?.profileData.visualVersion ?? 0,
      declared,
      goals: existing?.profileData.goals || ['saber_colores', 'maquillaje', 'compras'],
      jewelry: existing?.profileData.jewelry || 'dorado',
      styles: existing?.profileData.styles || ['Natural', 'Elegante']
    };

    const slot: AccountSlot = {
      accountId,
      profileData,
      permissions: existing?.permissions || createDefaultPermissions(Boolean(snapshot.accountId)),
      theme: existing?.theme || 'editorial',
      analysis: snapshot.analysis ?? existing?.analysis ?? null,
      network: {
        loading: existing?.network.loading ?? false,
        error: existing?.network.error ?? null,
        lastSyncedAt: existing?.network.lastSyncedAt ?? null,
        capabilities: existing?.network.capabilities ?? null,
        garments: snapshot.garments ?? existing?.network.garments ?? [],
        plans: snapshot.plans ?? existing?.network.plans ?? [],
        catalog: snapshot.catalog ?? existing?.network.catalog ?? [],
        tutorials: snapshot.tutorials ?? existing?.network.tutorials ?? []
      },
      isComparisonPeer: false
    };

    this.accounts.set(accountId, slot);
    if (!this.accounts.has(this.activeAccountId) || this.activeAccountId === 'guest') {
      this.activeAccountId = accountId;
    }
    return slot;
  }

  public getAccount(accountId: string): AccountSlot | undefined {
    return this.accounts.get(accountId);
  }

  public getActiveAccount(): AccountSlot {
    return (
      this.accounts.get(this.activeAccountId) ||
      this.accounts.values().next().value ||
      this.createFallbackSlot('guest')
    );
  }

  public getComparisonAccount(): AccountSlot {
    const peer = this.accounts.get(this.comparisonAccountId);
    if (peer && peer.accountId !== this.activeAccountId) {
      return peer;
    }
    for (const slot of this.accounts.values()) {
      if (slot.accountId !== this.activeAccountId) {
        return slot;
      }
    }
    return this.createFallbackSlot('peer-cold-studio');
  }

  public listAccounts(): AccountSlot[] {
    return Array.from(this.accounts.values());
  }

  public switchActiveAccount(nextAccountId: string): AccountSlot {
    if (this.activeAccountId && this.activeAccountId !== nextAccountId) {
      this.apiClient.abortAccountRequests(this.activeAccountId);
    }
    if (!this.accounts.has(nextAccountId)) {
      this.accounts.set(nextAccountId, this.createFallbackSlot(nextAccountId));
    }
    this.activeAccountId = nextAccountId;
    return this.getActiveAccount();
  }

  public setComparisonAccount(peerAccountId: string): AccountSlot {
    if (this.accounts.has(peerAccountId)) {
      this.comparisonAccountId = peerAccountId;
    }
    return this.getComparisonAccount();
  }

  public setAccountTheme(accountId: string, theme: StylingThemeMode): AccountSlot | undefined {
    const current = this.accounts.get(accountId);
    if (!current) return undefined;
    const updated: AccountSlot = { ...current, theme };
    this.accounts.set(accountId, updated);
    this.imagePipeline.clearAccountCache(accountId);
    return updated;
  }

  public upsertCustomAccount(params: {
    accountId: string;
    name: string;
    season: string;
    temperature: 'cálido' | 'frío' | 'neutro';
    palette: string[];
    theme?: StylingThemeMode;
    lipHex?: string;
    blushHex?: string;
  }): AccountSlot {
    const cleanPalette = params.palette.filter(h => /^#[0-9a-f]{6}$/i.test(h));
    const palette = cleanPalette.length >= 4 ? cleanPalette : WARM_DEFAULT_PALETTE;
    const slot: AccountSlot = {
      accountId: params.accountId,
      profileData: {
        name: params.name,
        handle: `@${params.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'perfil'}`,
        version: 2,
        visualVersion: 1,
        declared: {
          style: params.temperature === 'frío' ? 'Minimalista' : 'Elegante',
          finish: 'satinado',
          intensity: 'media',
          currency: 'EUR',
          budget: 45,
          skinType: 'Normal'
        }
      },
      permissions: createDefaultPermissions(false, true),
      theme: params.theme || (params.temperature === 'frío' ? 'studio' : 'editorial'),
      analysis: {
        analyzedAt: new Date().toISOString(),
        source: 'mock',
        schemaVersion: 2,
        profileVersion: 2,
        colorimetry: {
          season: params.season,
          temperature: params.temperature,
          contrast: 'medio',
          chroma: 'medio',
          palette,
          primaryHex: palette[0],
          avoid: [
            { name: 'Gris plomo', hex: '#4B5563', alt: palette[0] },
            { name: 'Negro puro', hex: '#111827', alt: palette[1] }
          ]
        },
        makeup: {
          look: params.temperature === 'frío' ? 'Cool Studio Glow' : 'Terracota Satin',
          lipHex: params.lipHex || (params.temperature === 'frío' ? '#9D4E73' : '#A4503E'),
          blushHex: params.blushHex || (params.temperature === 'frío' ? '#C77E98' : '#D58B78'),
          faceShape: 'oval',
          eyeShape: 'almendrada',
          eyelinerType: 'Trazo fino ascendente',
          shadowPlacement: 'Cuenca exterior difuminada',
          blushPlacement: 'Pómulo alto hacia la sien',
          applicationSteps: [
            'Prepara la piel con acabado luminoso.',
            'Aplica el tono medio en el arco ocular.',
            'Sella labios desde el centro.'
          ]
        },
        outfit: {
          style: params.temperature === 'frío' ? 'Sastrería fría contemporánea' : 'Atelier cálido natural',
          silhouette: 'Líneas fluidas con cintura estructurada',
          accent: palette[0]
        },
        outfits: [
          {
            top: 'Blusa seda marfil',
            bottom: 'Denim recto medio',
            jacket: 'Blazer estructurado',
            acc: 'Pendientes aro'
          }
        ]
      },
      network: {
        loading: false,
        error: null,
        lastSyncedAt: new Date().toISOString(),
        capabilities: { configured: true, provider: 'mock' },
        garments: [],
        plans: [],
        catalog: [],
        tutorials: []
      },
      isComparisonPeer: true
    };
    this.accounts.set(params.accountId, slot);
    return slot;
  }

  public updateAccountSlot(accountId: string, updater: (prev: AccountSlot) => AccountSlot): AccountSlot | undefined {
    const current = this.accounts.get(accountId);
    if (!current) return undefined;
    const next = updater(current);
    this.accounts.set(accountId, next);
    return next;
  }

  private seedComparisonPeer(): void {
    this.upsertCustomAccount({
      accountId: 'peer-cold-studio',
      name: 'Clara · Invierno Frío',
      season: 'Invierno Frío',
      temperature: 'frío',
      palette: COLD_COMPARISON_PALETTE,
      theme: 'studio',
      lipHex: '#9D4E73',
      blushHex: '#C77E98'
    });
  }

  private createFallbackSlot(accountId: string): AccountSlot {
    return {
      accountId,
      profileData: {
        name: 'Invitada',
        handle: '@stylingu',
        version: 1,
        visualVersion: 0,
        declared: { currency: 'EUR', skinType: 'No lo sé', intensity: 'media' }
      },
      permissions: createDefaultPermissions(false),
      theme: 'editorial',
      analysis: null,
      network: {
        loading: false,
        error: null,
        lastSyncedAt: null,
        capabilities: null,
        garments: [],
        plans: [],
        catalog: [],
        tutorials: []
      }
    };
  }
}

export interface MultiAccountContextValue {
  activeAccount: AccountSlot;
  comparisonAccount: AccountSlot;
  accounts: AccountSlot[];
  fileVersion: string;
  switchAccount: (accountId: string) => void;
  setComparisonAccountId: (accountId: string) => void;
  setThemeForAccount: (accountId: string, theme: StylingThemeMode) => void;
  createComparisonProfile: (name: string, temperature: 'cálido' | 'frío') => AccountSlot;
  refreshActiveAccountNetwork: () => Promise<void>;
  importDossierForAccount: (accountId: string, rawJson: string) => { ok: boolean; message: string };
}

const MultiAccountContext = createContext<MultiAccountContextValue | null>(null);

export function MultiAccountProvider({
  snapshot,
  children
}: {
  snapshot: Snapshot;
  children: ReactNode;
}) {
  const registryRef = useRef<MultiAccountRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new MultiAccountRegistry();
  }
  const registry = registryRef.current;

  const [, setRevision] = useState(0);
  const bump = () => setRevision(r => r + 1);

  useEffect(() => {
    const primary = registry.syncPrimaryFromSnapshot(snapshot);
    const currentActive = registry.getActiveAccount();
    if (!currentActive.isComparisonPeer && currentActive.accountId !== primary.accountId) {
      registry.switchActiveAccount(primary.accountId);
    }
    bump();
  }, [registry, snapshot]);

  const activeAccount = registry.getActiveAccount();
  const comparisonAccount = registry.getComparisonAccount();

  useEffect(() => {
    const targetId = activeAccount.accountId;
    if (!targetId || targetId === 'guest' || activeAccount.isComparisonPeer) {
      return;
    }
    let cancelled = false;
    registry.updateAccountSlot(targetId, prev => ({
      ...prev,
      network: { ...prev.network, loading: true, error: null }
    }));
    bump();

    defaultApiClient
      .fetchAccountBundle(targetId, false)
      .then(bundle => {
        if (cancelled) return;
        registry.updateAccountSlot(targetId, prev => ({
          ...prev,
          profileData: {
            ...prev.profileData,
            version: bundle.profile?.version ?? prev.profileData.version,
            visualVersion: bundle.profile?.visualVersion ?? prev.profileData.visualVersion,
            declared: { ...prev.profileData.declared, ...(bundle.profile?.declared || {}) },
            goals: bundle.preferences?.goals ?? prev.profileData.goals,
            jewelry: bundle.preferences?.jewelry ?? prev.profileData.jewelry,
            styles: bundle.preferences?.styles ?? prev.profileData.styles
          },
          analysis: bundle.analysis ?? prev.analysis,
          network: {
            loading: false,
            error: null,
            lastSyncedAt: new Date().toISOString(),
            capabilities: bundle.capabilities,
            garments: bundle.garments.length ? bundle.garments : prev.network.garments,
            plans: bundle.plans.length ? bundle.plans : prev.network.plans,
            catalog: bundle.catalog.length ? bundle.catalog : prev.network.catalog,
            tutorials: bundle.tutorials.length ? bundle.tutorials : prev.network.tutorials
          }
        }));
        bump();
      })
      .catch(err => {
        if (cancelled) return;
        registry.updateAccountSlot(targetId, prev => ({
          ...prev,
          network: {
            ...prev.network,
            loading: false,
            error: err instanceof Error ? err.message : 'No se pudo sincronizar la cuenta.'
          }
        }));
        bump();
      });

    return () => {
      cancelled = true;
      defaultApiClient.abortAccountRequests(targetId);
    };
  }, [activeAccount.accountId, activeAccount.isComparisonPeer, registry]);

  const value = useMemo<MultiAccountContextValue>(
    () => ({
      activeAccount: registry.getActiveAccount(),
      comparisonAccount: registry.getComparisonAccount(),
      accounts: registry.listAccounts(),
      fileVersion: REQUIRED_FILE_VERSION,
      switchAccount: (accountId: string) => {
        registry.switchActiveAccount(accountId);
        bump();
      },
      setComparisonAccountId: (accountId: string) => {
        registry.setComparisonAccount(accountId);
        bump();
      },
      setThemeForAccount: (accountId: string, theme: StylingThemeMode) => {
        registry.setAccountTheme(accountId, theme);
        bump();
      },
      createComparisonProfile: (name: string, temperature: 'cálido' | 'frío') => {
        const cleanName = name.trim().slice(0, 40) || 'Perfil Estudio';
        const id = `peer-${Date.now().toString(36)}`;
        const created = registry.upsertCustomAccount({
          accountId: id,
          name: cleanName,
          season: temperature === 'frío' ? 'Verano Suave Frío' : 'Otoño Cálido Luminoso',
          temperature,
          palette: temperature === 'frío' ? COLD_COMPARISON_PALETTE : WARM_DEFAULT_PALETTE,
          theme: temperature === 'frío' ? 'studio' : 'editorial'
        });
        registry.setComparisonAccount(created.accountId);
        bump();
        return created;
      },
      refreshActiveAccountNetwork: async () => {
        const current = registry.getActiveAccount();
        if (!current.accountId || current.accountId === 'guest' || current.isComparisonPeer) return;
        registry.updateAccountSlot(current.accountId, prev => ({
          ...prev,
          network: { ...prev.network, loading: true, error: null }
        }));
        bump();
        try {
          const bundle = await defaultApiClient.fetchAccountBundle(current.accountId, true);
          registry.updateAccountSlot(current.accountId, prev => ({
            ...prev,
            analysis: bundle.analysis ?? prev.analysis,
            network: {
              loading: false,
              error: null,
              lastSyncedAt: new Date().toISOString(),
              capabilities: bundle.capabilities,
              garments: bundle.garments,
              plans: bundle.plans,
              catalog: bundle.catalog,
              tutorials: bundle.tutorials
            }
          }));
        } catch (err) {
          registry.updateAccountSlot(current.accountId, prev => ({
            ...prev,
            network: {
              ...prev.network,
              loading: false,
              error: err instanceof Error ? err.message : 'Error al revalidar datos.'
            }
          }));
        }
        bump();
      },
      importDossierForAccount: (accountId: string, rawJson: string) => {
        try {
          const parsed = JSON.parse(rawJson);
          const validation = defaultFileSpecPolicy.validateDossierPayload(parsed);
          if (!validation.valid) {
            return { ok: false, message: validation.reason || `Archivo incompatible con ${REQUIRED_FILE_VERSION}.` };
          }
          registry.updateAccountSlot(accountId, prev => ({
            ...prev,
            analysis: {
              ...(prev.analysis || {}),
              ...(parsed as Analysis),
              schemaVersion: defaultFileSpecPolicy.getSchemaVersion()
            }
          }));
          bump();
          return { ok: true, message: `Dossier ${REQUIRED_FILE_VERSION} importado en la cuenta ${accountId}.` };
        } catch {
          return { ok: false, message: `El archivo JSON no es válido (se requiere ${REQUIRED_FILE_VERSION}).` };
        }
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccount, comparisonAccount, snapshot]
  );

  return <MultiAccountContext.Provider value={value}>{children}</MultiAccountContext.Provider>;
}

export function useMultiAccount(): MultiAccountContextValue {
  const ctx = useContext(MultiAccountContext);
  if (!ctx) {
    throw new Error('useMultiAccount debe utilizarse dentro de MultiAccountProvider.');
  }
  return ctx;
}

/**
 * Componente puro de insignia de versión de archivo requerida ([VERSION_ARCHIVO]).
 */
export function FileVersionBadge({
  compact = false,
  className = ''
}: {
  compact?: boolean;
  className?: string;
}) {
  const meta = defaultFileSpecPolicy.getMetadata();
  return (
    <span
      className={`su-file-version-badge ${compact ? 'is-compact' : ''} ${className}`.trim()}
      title={meta.fullLabel}
      data-file-version={meta.version}
    >
      <span className="su-file-version-dot" aria-hidden="true" />
      <span>{compact ? meta.shortBadge : meta.fullLabel}</span>
    </span>
  );
}

/**
 * Componente puro y parametrizado para renderizar imágenes de perfil procesadas
 * obligatoriamente por el pipeline de estilizado (nunca en crudo).
 */
export function StylizedProfileAvatar({
  accountId,
  name,
  rawPhoto,
  preset = 'avatar-square',
  theme = 'editorial',
  accentHex,
  className = '',
  alt
}: {
  accountId: string;
  name: string;
  rawPhoto?: string;
  preset?: ProfileImagePreset;
  theme?: StylingThemeMode;
  accentHex?: string;
  className?: string;
  alt?: string;
}) {
  const initials = (name || 'S').trim().slice(0, 1).toUpperCase();
  const [styled, setStyled] = useState(() =>
    defaultProfileImagePipeline.buildStylizedFallback(initials, {
      accountId,
      preset,
      theme,
      accentHex
    })
  );

  useEffect(() => {
    let active = true;
    const apiBase = typeof window !== 'undefined' ? window.STYLINGU_API_BASE || '' : '';
    defaultProfileImagePipeline
      .processProfileImage(
        rawPhoto,
        initials,
        { accountId, preset, theme, accentHex },
        apiBase
      )
      .then(result => {
        if (active) setStyled(result);
      });
    return () => {
      active = false;
    };
  }, [accountId, rawPhoto, initials, preset, theme, accentHex]);

  return (
    <span
      className={`su-stylized-avatar su-stylized-${preset} ${className}`.trim()}
      data-account-id={accountId}
      data-styled-version={styled.fileVersion}
    >
      <img
        src={styled.dataUrl}
        alt={alt || `Retrato estilizado de ${name || 'usuario'}`}
        loading="lazy"
      />
    </span>
  );
}

/**
 * Selector multicuenta desacoplado para alternar entre cuentas aisladas,
 * crear perfiles comparativos y conmutar el tema ('editorial' | 'studio').
 */
export function AccountSwitcher({
  onOpenAuthModal
}: {
  onOpenAuthModal?: () => void;
}) {
  const {
    activeAccount,
    accounts,
    switchAccount,
    setThemeForAccount,
    createComparisonProfile
  } = useMultiAccount();
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileTemp, setNewProfileTemp] = useState<'cálido' | 'frío'>('frío');

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProfileName.trim()) return;
    const created = createComparisonProfile(newProfileName, newProfileTemp);
    setNewProfileName('');
    switchAccount(created.accountId);
  };

  return (
    <section className="su-account-switcher" aria-label="Gestor multicuenta">
      <div className="su-account-switcher-head">
        <div>
          <p className="su-kicker">Arquitectura Multicuenta</p>
          <strong className="su-account-switcher-title">Perfiles aislados en sesión</strong>
        </div>
        <FileVersionBadge compact />
      </div>

      <div className="su-account-list" role="list">
        {accounts.map(slot => {
          const isCurrent = slot.accountId === activeAccount.accountId;
          const face = slot.analysis?.photos?.face;
          const primaryHex = slot.analysis?.colorimetry.palette?.[0];
          return (
            <div
              key={slot.accountId}
              role="listitem"
              className={`su-account-pill ${isCurrent ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="su-account-select"
                onClick={() => switchAccount(slot.accountId)}
                aria-pressed={isCurrent}
              >
                <StylizedProfileAvatar
                  accountId={slot.accountId}
                  name={slot.profileData.name}
                  rawPhoto={face}
                  theme={slot.theme}
                  accentHex={primaryHex}
                />
                <span className="su-account-meta">
                  <strong>{slot.profileData.name}</strong>
                  <small>
                    {slot.analysis?.colorimetry.season || 'Sin estación'} · v{slot.profileData.version}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="su-theme-toggle"
                onClick={() =>
                  setThemeForAccount(
                    slot.accountId,
                    slot.theme === 'studio' ? 'editorial' : 'studio'
                  )
                }
                aria-label={`Cambiar tema de ${slot.profileData.name}`}
                title="Alternar tema Editorial / Studio"
              >
                {slot.theme === 'studio' ? 'Studio' : 'Editorial'}
              </button>
            </div>
          );
        })}
      </div>

      <form className="su-account-add" onSubmit={handleCreate}>
        <input
          type="text"
          value={newProfileName}
          onChange={e => setNewProfileName(e.target.value)}
          placeholder="Añadir perfil en local (ej. Sofía)"
          maxLength={40}
          aria-label="Nombre del nuevo perfil comparativo"
        />
        <select
          value={newProfileTemp}
          onChange={e => setNewProfileTemp(e.target.value as 'cálido' | 'frío')}
          aria-label="Subtono del perfil comparativo"
        >
          <option value="frío">Frío (Studio)</option>
          <option value="cálido">Cálido (Editorial)</option>
        </select>
        <button type="submit" className="su-mini">
          + Perfil
        </button>
      </form>

      {onOpenAuthModal && (
        <button type="button" className="su-link" onClick={onOpenAuthModal}>
          Cambiar sesión del servidor o gestionar privacidad
        </button>
      )}
    </section>
  );
}
