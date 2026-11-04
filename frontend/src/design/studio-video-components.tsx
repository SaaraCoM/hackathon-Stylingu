import { useMemo, useState } from 'react';
import type { AccountSlot, StudioSubTab, View } from './types';
import { DEFAULT_PALETTE, looks, products } from './content';
import {
  FileVersionBadge,
  StylizedProfileAvatar,
  useMultiAccount
} from './multi-account';
import { defaultFileSpecPolicy, REQUIRED_FILE_VERSION } from './file-version';
import { defaultApiClient, type PurchaseRecommendationResponse } from './api-client';
import {
  defaultColorimetryAtlas,
  SUBRANGE_METADATA,
  type ColorSubRangeKey,
  type SeasonColorimetrySpec,
  type SeasonFamilyKey
} from './colorimetry-atlas';
import {
  defaultVisagismGuide,
  type EyewearFrameStyle,
  type FaceShapeKey
} from './visagism-guide';
import {
  ArrowIcon,
  BagIcon,
  CameraIcon,
  ChevronIcon,
  HangerIcon,
  HomeIcon,
  PaletteIcon,
  SparkleIcon
} from './icons';

const isHex = (value?: string): value is string => /^#[a-f0-9]{6}$/i.test(value || '');

const COLD_WHEEL_TONES = [
  '#1E3A5F', '#28597E', '#367096', '#4D8BB0', '#6BA5C4', '#8EC2D6',
  '#3B2D54', '#5A3D7A', '#7A4988', '#9D4E73', '#B84C7B', '#4A6FA5'
];

function expandWheelTones(basePalette: string[], fallback: string[]): string[] {
  const valid = basePalette.filter(isHex);
  const source = valid.length ? valid : fallback;
  const count = Math.max(12, source.length);
  return Array.from({ length: count }, (_, idx) => source[idx % source.length]);
}

function buildWheelSegments(tones: string[], cx = 110, cy = 110, rOuter = 98, rInner = 54) {
  const total = Math.max(1, tones.length);
  const stepDeg = 360 / total;
  return tones.map((hex, index) => {
    const startAngle = ((index * stepDeg - 90) * Math.PI) / 180;
    const endAngle = (((index + 1) * stepDeg - 90) * Math.PI) / 180;
    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);
    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      'Z'
    ].join(' ');
    return { hex, d, index };
  });
}

/**
 * Barra lateral vertical de escritorio inspirada en el vídeo de referencia (00:03-00:05).
 */
export function StudioDesktopSidebar({
  currentView,
  onNavigate,
  onOpenAccount,
  onOpenNotifications
}: {
  currentView: View;
  onNavigate: (view: View) => void;
  onOpenAccount: () => void;
  onOpenNotifications: () => void;
}) {
  const { activeAccount } = useMultiAccount();
  const face = activeAccount.analysis?.photos?.face;
  const primaryHex = activeAccount.analysis?.colorimetry.palette?.[0];

  const items: { id: View; label: string; sub: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'inicio', label: 'Personalizado', sub: 'Stylingu', icon: <HomeIcon /> },
    { id: 'color', label: 'Colorimetría', sub: 'Recepción', icon: <PaletteIcon /> },
    { id: 'makeup', label: 'Resultados', sub: 'Makeup', icon: <SparkleIcon /> },
    { id: 'armario', label: 'Estilismos', sub: 'Outfits', icon: <HangerIcon />, badge: '99' },
    { id: 'compras', label: 'Favoritos', sub: 'AIShoppie', icon: <BagIcon /> }
  ];

  return (
    <aside className="su-studio-sidebar" aria-label="Acceso rápido de estudio">
      <div className="su-sidebar-items">
        {items.map(item => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`su-sidebar-btn ${active ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="su-sidebar-icon">
                {item.icon}
                {item.badge && (
                  <span className="su-sidebar-pill" aria-hidden="true">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="su-sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="su-sidebar-foot">
        <button
          type="button"
          className="su-sidebar-profile"
          onClick={onOpenAccount}
          aria-label="Abrir perfil y selector multicuenta"
        >
          <StylizedProfileAvatar
            accountId={activeAccount.accountId}
            name={activeAccount.profileData.name}
            rawPhoto={face}
            theme={activeAccount.theme}
            accentHex={primaryHex}
          />
          <span className="su-sidebar-label" data-private>
            Profile
          </span>
        </button>
        <button
          type="button"
          className="su-sidebar-ver"
          onClick={onOpenNotifications}
          aria-label={`Versión de archivo requerida ${REQUIRED_FILE_VERSION}`}
        >
          {REQUIRED_FILE_VERSION}
        </button>
      </div>
    </aside>
  );
}

/**
 * Barra de sub-pestañas del estudio (Results · Similar · Collage) mostrada en el vídeo (00:03-00:05).
 */
export function StudioSubTabsBar({
  activeTab,
  onSelectTab,
  toneFilter,
  onCycleToneFilter
}: {
  activeTab: StudioSubTab;
  onSelectTab: (tab: StudioSubTab) => void;
  toneFilter: 'all' | 'warm' | 'cold';
  onCycleToneFilter: () => void;
}) {
  const tabs: { id: StudioSubTab; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'similar', label: 'Similar' },
    { id: 'collage', label: 'Collage' }
  ];

  const filterLabel =
    toneFilter === 'warm'
      ? 'Tonos: Cálidos'
      : toneFilter === 'cold'
        ? 'Tonos: Fríos'
        : 'Regular tonos';

  return (
    <div className="su-subtabs-bar" role="region" aria-label="Vistas del estudio de colorimetría">
      <div className="su-subtabs" role="tablist" aria-label="Modo de visualización">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`su-subtab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="su-subtabs-actions">
        <FileVersionBadge compact />
        <button
          type="button"
          className="su-filter-btn"
          onClick={onCycleToneFilter}
          aria-label="Filtrar temperatura de tonos"
        >
          {filterLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Rueda comparativa interactiva Warm vs Cold y widget COLORGE (00:03-00:04 del vídeo).
 * Soporta comparar la armonía completa de la cuenta activa frente a las 12 estaciones o a otra cuenta.
 */
export function ColorWheelComparator({
  primaryAccount,
  peerAccount,
  toneFilter = 'all',
  comparedSeasonId,
  onSelectComparedSeason
}: {
  primaryAccount: AccountSlot;
  peerAccount: AccountSlot;
  toneFilter?: 'all' | 'warm' | 'cold';
  comparedSeasonId?: string;
  onSelectComparedSeason?: (seasonId: string) => void;
}) {
  const allSeasons = useMemo(() => defaultColorimetryAtlas.getAllSeasons(), []);
  const personalBreakdown = useMemo(
    () => defaultColorimetryAtlas.buildPersonalBreakdown(primaryAccount.analysis),
    [primaryAccount.analysis]
  );

  const [harmonyBalance, setHarmonyBalance] = useState(25);
  const [compareAccountsMode, setCompareAccountsMode] = useState(false);
  const [internalSeasonId, setInternalSeasonId] = useState<string>('verano-frio');
  const activeRightSeasonId = comparedSeasonId || internalSeasonId;

  const setRightSeasonId = (id: string) => {
    setInternalSeasonId(id);
    onSelectComparedSeason?.(id);
  };

  const rightSeasonSpec = useMemo(
    () => defaultColorimetryAtlas.findSeason(activeRightSeasonId),
    [activeRightSeasonId]
  );

  const [selectedHex, setSelectedHex] = useState<string>(() => {
    const first = primaryAccount.analysis?.colorimetry.palette?.[0];
    return isHex(first) ? first : DEFAULT_PALETTE[0];
  });

  const warmPalette = useMemo(() => {
    const own = (primaryAccount.analysis?.colorimetry.palette || []).filter(isHex);
    const fullSeasonHexes = personalBreakdown.allHarmoniousSwatches.map(s => s.hex);
    const merged = Array.from(new Set([...own.map(h => h.toUpperCase()), ...fullSeasonHexes]));
    return merged.length ? merged : DEFAULT_PALETTE;
  }, [primaryAccount.analysis, personalBreakdown]);

  const coldPalette = useMemo(() => {
    if (compareAccountsMode) {
      const peerBreakdown = defaultColorimetryAtlas.buildPersonalBreakdown(peerAccount.analysis);
      const peerOwn = (peerAccount.analysis?.colorimetry.palette || []).filter(isHex);
      const peerMerged = Array.from(
        new Set([
          ...peerOwn.map(h => h.toUpperCase()),
          ...peerBreakdown.allHarmoniousSwatches.map(s => s.hex)
        ])
      );
      if (peerMerged.length) return peerMerged;
    }
    return defaultColorimetryAtlas
      .getAllHarmoniousSwatchesForSeason(rightSeasonSpec)
      .map(s => s.hex);
  }, [compareAccountsMode, peerAccount.analysis, rightSeasonSpec]);

  const leftWheelSegments = useMemo(
    () => buildWheelSegments(expandWheelTones(warmPalette, DEFAULT_PALETTE)),
    [warmPalette]
  );

  const rightWheelSegments = useMemo(
    () => buildWheelSegments(expandWheelTones(coldPalette, COLD_WHEEL_TONES)),
    [coldPalette]
  );

  const miniWheelSegments = useMemo(
    () =>
      buildWheelSegments(
        expandWheelTones([...warmPalette, ...coldPalette], DEFAULT_PALETTE),
        36,
        36,
        32,
        14
      ),
    [warmPalette, coldPalette]
  );

  return (
    <section className="su-wheel-comparator" aria-label="Comparador cromático Warm vs Cold">
      <div className="su-wheel-stage">
        {/* Tarjeta izquierda: Armonía completa de la cuenta principal con ilustración facial */}
        <article
          className={`su-wheel-card ${toneFilter === 'cold' ? 'is-dimmed' : ''}`}
          data-account-id={primaryAccount.accountId}
        >
          <div className="su-wheel-card-top">
            <span className="su-wheel-badge">
              {primaryAccount.analysis?.colorimetry.season || personalBreakdown.matchedSeason.name}
            </span>
            <span className="su-wheel-account su-personal" data-private>
              {primaryAccount.profileData.name} · {warmPalette.length} tonos
            </span>
          </div>

          <div className="su-wheel-canvas-wrap">
            <svg
              viewBox="0 0 220 220"
              className="su-wheel-svg"
              role="img"
              aria-label="Rueda cromática sobre contorno facial"
            >
              {leftWheelSegments.map(seg => (
                <path
                  key={seg.index}
                  d={seg.d}
                  fill={seg.hex}
                  stroke="#fffdf9"
                  strokeWidth="1.5"
                  className="su-wheel-segment"
                  onClick={() => setSelectedHex(seg.hex)}
                />
              ))}
              <circle cx="110" cy="110" r="52" fill="#fffdf9" stroke="#e5d9cc" strokeWidth="1.5" />
              {/* Ilustración lineal del rostro como en el fotograma 00:03 del vídeo */}
              <g stroke="#2e2b27" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M84 88 C84 66, 136 66, 136 88 C136 102, 134 128, 110 144 C86 128, 84 102, 84 88 Z" />
                <path d="M84 86 C94 74, 126 74, 136 86" />
                <path d="M93 99 Q100 95 106 99" />
                <path d="M114 99 Q120 95 127 99" />
                <ellipse cx="99" cy="104" rx="4.2" ry="2.4" />
                <ellipse cx="121" cy="104" rx="4.2" ry="2.4" />
                <path d="M110 104 L108 117 Q110 119 113 117" />
                <path d="M101 127 Q110 132 119 127" />
                <path d="M103 127 Q110 124 117 127" />
                <path d="M95 140 L92 154 M125 140 L128 154" />
              </g>
            </svg>
          </div>

          <div className="su-wheel-labels">
            <strong>Warm</strong>
            <span>{primaryAccount.analysis?.colorimetry.temperature || personalBreakdown.matchedSeason.temperature}</span>
            <strong>Cold</strong>
          </div>

          <div className="su-wheel-strip" role="list" aria-label="Todos los tonos de la cuenta activa">
            {warmPalette.map((hex, idx) => (
              <button
                key={hex + idx}
                type="button"
                role="listitem"
                className={`su-wheel-swatch ${selectedHex.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}`}
                style={{ backgroundColor: hex }}
                onClick={() => setSelectedHex(hex)}
                aria-label={`Seleccionar tono ${hex}`}
                title={hex}
              />
            ))}
          </div>

          <label className="su-wheel-slider">
            <span>Equilibrio térmico ({harmonyBalance}%)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={harmonyBalance}
              onChange={e => setHarmonyBalance(Number(e.target.value))}
              aria-label="Equilibrio térmico entre cálido y frío"
            />
          </label>
        </article>

        {/* Botón central VS (00:03-00:04 del vídeo) */}
        <div className="su-wheel-vs-col">
          <button
            type="button"
            className={`su-wheel-vs ${compareAccountsMode ? 'is-active' : ''}`}
            onClick={() => setCompareAccountsMode(prev => !prev)}
            aria-pressed={compareAccountsMode}
            title="Alternar comparación frente a las 12 estaciones o Cuenta A vs Cuenta B"
          >
            VS
          </button>
          <small className="su-wheel-vs-caption">
            {compareAccountsMode ? 'Multicuenta' : '12 Estaciones'}
          </small>
        </div>

        {/* Tarjeta derecha: Estación comparada (de las 12 estaciones) o Cuenta B */}
        <article
          className={`su-wheel-card su-wheel-card-cold ${toneFilter === 'warm' ? 'is-dimmed' : ''}`}
          data-account-id={compareAccountsMode ? peerAccount.accountId : primaryAccount.accountId}
        >
          <div className="su-wheel-card-top">
            <span className="su-wheel-badge">
              {compareAccountsMode
                ? peerAccount.analysis?.colorimetry.season || 'Perfil Comparado'
                : rightSeasonSpec.name}
            </span>
            {compareAccountsMode ? (
              <span className="su-wheel-account su-personal" data-private>
                {peerAccount.profileData.name} · {coldPalette.length} tonos
              </span>
            ) : (
              <select
                className="su-wheel-season-select"
                value={rightSeasonSpec.id}
                onChange={e => setRightSeasonId(e.target.value)}
                aria-label="Seleccionar estación de colorimetría para comparar"
              >
                {allSeasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.temperature})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="su-wheel-canvas-wrap">
            <svg
              viewBox="0 0 220 220"
              className="su-wheel-svg"
              role="img"
              aria-label="Rueda cromática de estación o cuenta comparada"
            >
              {rightWheelSegments.map(seg => (
                <path
                  key={seg.index}
                  d={seg.d}
                  fill={seg.hex}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="su-wheel-segment"
                  onClick={() => setSelectedHex(seg.hex)}
                />
              ))}
              <circle cx="110" cy="110" r="44" fill="rgba(255,255,255,0.92)" />
              <circle
                cx="110"
                cy="110"
                r="24"
                fill="none"
                stroke="#4a5568"
                strokeWidth="3.5"
                strokeDasharray="95 45"
              />
              <text
                x="110"
                y="115"
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="#2e2b27"
              >
                {compareAccountsMode ? 'PEER' : 'VS'}
              </text>
            </svg>
          </div>

          <div className="su-wheel-labels">
            <strong>{rightSeasonSpec.familyLabel}</strong>
            <span>{compareAccountsMode ? 'Cuenta B' : rightSeasonSpec.chroma}</span>
            <strong>{rightSeasonSpec.temperature}</strong>
          </div>

          <div className="su-wheel-strip" role="list" aria-label="Todos los tonos de la estación comparada">
            {coldPalette.map((hex, idx) => (
              <button
                key={hex + idx}
                type="button"
                role="listitem"
                className={`su-wheel-swatch ${selectedHex.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}`}
                style={{ backgroundColor: hex }}
                onClick={() => setSelectedHex(hex)}
                aria-label={`Seleccionar tono de contraste ${hex}`}
                title={hex}
              />
            ))}
          </div>
        </article>

        {/* Columna derecha COLORGE del vídeo (00:03-00:05) */}
        <aside className="su-colorge-widget" aria-label="Selector rápido COLORGE">
          <span className="su-colorge-plus" aria-hidden="true">
            +
          </span>
          <strong className="su-colorge-title">COLORGE</strong>
          <svg viewBox="0 0 72 72" className="su-colorge-mini" aria-hidden="true">
            {miniWheelSegments.map(seg => (
              <path key={seg.index} d={seg.d} fill={seg.hex} />
            ))}
            <circle cx="36" cy="36" r="11" fill="#ffffff" />
          </svg>
          <span
            className="su-colorge-gradient"
            style={{
              background: `linear-gradient(135deg, ${selectedHex}, ${coldPalette[0] || '#367096'})`
            }}
            title={`Tono activo: ${selectedHex.toUpperCase()}`}
          />
          <code className="su-colorge-hex">{selectedHex.toUpperCase()}</code>
        </aside>
      </div>
    </section>
  );
}

/**
 * Fila de medallones circulares de labios, rubor y piel mostrada en el vídeo (00:04-00:05).
 */
export function MakeupMedallionsRow({
  account,
  onOpenTryOn
}: {
  account: AccountSlot;
  onOpenTryOn: () => void;
}) {
  const palette = (account.analysis?.colorimetry.palette || []).filter(isHex);
  const lipWarm1 = isHex(account.analysis?.makeup?.lipHex) ? account.analysis!.makeup!.lipHex! : '#B4583F';
  const lipWarm2 = palette[1] || '#C98A7B';
  const lipCold = '#9D4E73';
  const blushHex = isHex(account.analysis?.makeup?.blushHex) ? account.analysis!.makeup!.blushHex! : '#D58B78';

  const lipMedallions = [
    { id: 'warm-1', label: 'Warm', sub: 'Labio terracota', hex: lipWarm1, skin: '#E5BFA8' },
    { id: 'warm-2', label: 'Warm', sub: 'Nude cálido', hex: lipWarm2, skin: '#DFB39A' },
    { id: 'cold-1', label: 'Cold', sub: 'Malva frío', hex: lipCold, skin: '#E8C5B8' }
  ];

  return (
    <section className="su-medallions-row" aria-label="Medallones de subtono en labios y piel">
      <div className="su-medallions-lips">
        {lipMedallions.map(item => (
          <button
            key={item.id}
            type="button"
            className="su-medallion-item"
            onClick={onOpenTryOn}
            aria-label={`Probar tono ${item.label}: ${item.sub}`}
          >
            <span className="su-medallion-circle" style={{ backgroundColor: item.skin }}>
              <svg viewBox="0 0 80 50" className="su-medallion-lips-svg" aria-hidden="true">
                <path
                  d="M10 26 Q25 12 40 20 Q55 12 70 26 Q55 28 40 27 Q25 28 10 26 Z"
                  fill={item.hex}
                />
                <path
                  d="M10 26 Q25 42 40 42 Q55 42 70 26 Q55 29 40 28 Q25 29 10 26 Z"
                  fill={item.hex}
                  opacity="0.9"
                />
                <path
                  d="M24 32 Q40 36 56 32"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <strong>{item.label}</strong>
            <small>{item.sub}</small>
          </button>
        ))}
      </div>

      <div className="su-medallions-skin">
        <button
          type="button"
          className="su-medallion-feature"
          onClick={onOpenTryOn}
          aria-label="Abrir probador de experimentos de maquillaje"
        >
          <span
            className="su-medallion-sphere"
            style={{
              background: `radial-gradient(circle at 35% 30%, #f7d9c9, ${lipWarm1} 72%, #7d4034 100%)`
            }}
          >
            <span className="su-medallion-pill">Nuet</span>
          </span>
          <strong>Makeup Experiments</strong>
          <small>{account.analysis?.makeup?.look || 'Acabado segunda piel'}</small>
        </button>

        <button
          type="button"
          className="su-medallion-feature"
          onClick={onOpenTryOn}
          aria-label="Abrir guía de estilo de rubor"
        >
          <span
            className="su-medallion-sphere"
            style={{
              background: `radial-gradient(circle at 35% 30%, #fae3d6, ${blushHex} 68%, #9e5446 100%)`
            }}
          />
          <strong>Blush Style</strong>
          <small>{account.analysis?.makeup?.blushPlacement || 'Pómulo ascendente'}</small>
        </button>
      </div>
    </section>
  );
}

/**
 * Carrusel horizontal de estilismos por colorimetría mostrado en el fotograma 00:05 del vídeo.
 */
export function ColorimetryOutfitsCarousel({
  account,
  onNavigateOutfits
}: {
  account: AccountSlot;
  onNavigateOutfits: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const palette = (account.analysis?.colorimetry.palette || []).filter(isHex);
  const effectivePalette = palette.length ? palette : DEFAULT_PALETTE;
  const currency = account.profileData.declared.currency || 'EUR';
  const baseBudget = account.profileData.declared.budget || 35;

  const formatPrice = (amount: number) =>
    currency === 'USD' ? `$${amount}` : currency === 'GBP' ? `£${amount}` : `${amount} €`;

  const cards = useMemo(() => {
    const aiOutfits = account.analysis?.outfits || [];
    return [
      {
        id: 'card-warm-1',
        badge: 'Warm',
        title: aiOutfits[0]?.jacket || 'Colidi · Blazer Camel',
        subtitle: aiOutfits[0] ? `${aiOutfits[0].top} · ${aiOutfits[0].bottom}` : looks[0].note,
        price: formatPrice(baseBudget),
        image: looks[0].image,
        swatches: [effectivePalette[0] || '#C49A45', effectivePalette[3] || '#865044']
      },
      {
        id: 'card-cold-2',
        badge: 'Warm',
        title: aiOutfits[1]?.jacket || 'Coldi · Sastrería Celeste',
        subtitle: aiOutfits[1] ? `${aiOutfits[1].top} · ${aiOutfits[1].bottom}` : looks[1].note,
        price: formatPrice(baseBudget),
        image: looks[1].image,
        swatches: [effectivePalette[1] || '#C98A7B', '#4D8BB0']
      },
      {
        id: 'card-blush-3',
        badge: 'Blush',
        title: aiOutfits[2]?.top || 'Bluda · Seda Marfil',
        subtitle: aiOutfits[2] ? `${aiOutfits[2].bottom} · ${aiOutfits[2].acc}` : looks[3].note,
        price: formatPrice(baseBudget + 20),
        image: looks[3].image,
        swatches: [effectivePalette[2] || '#D5B5AB', effectivePalette[4] || '#58624B']
      },
      {
        id: 'card-evening-4',
        badge: 'Warm',
        title: looks[2].name,
        subtitle: looks[2].note,
        price: formatPrice(baseBudget + 15),
        image: looks[2].image,
        swatches: [effectivePalette[0] || '#865044', '#5B21B6']
      }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.analysis?.outfits, baseBudget, currency, effectivePalette]);

  const orderedCards = useMemo(() => {
    return cards.map((_, i) => cards[(i + offset) % cards.length]);
  }, [cards, offset]);

  return (
    <section className="su-video-carousel-section" aria-label="Recomendaciones de vestuario por colorimetría">
      <div className="su-video-carousel-head">
        <div>
          <h2>Recomendaciones de tu colorimetría</h2>
          <p>Conjuntos alineados con tu temperatura, contraste y presupuesto declarado.</p>
        </div>
        <div className="su-video-carousel-controls">
          <button
            type="button"
            className="su-carousel-arrow"
            onClick={() => setOffset(prev => (prev - 1 + cards.length) % cards.length)}
            aria-label="Anterior conjunto recomendado"
          >
            ‹
          </button>
          <button
            type="button"
            className="su-carousel-arrow"
            onClick={() => setOffset(prev => (prev + 1) % cards.length)}
            aria-label="Siguiente conjunto recomendado"
          >
            ›
          </button>
          <button type="button" className="su-puncar-btn" onClick={onNavigateOutfits}>
            Explorar tonos
          </button>
        </div>
      </div>

      <div className="su-video-carousel-grid">
        {orderedCards.slice(0, 3).map(card => (
          <article key={card.id} className="su-video-outfit-card">
            <div className="su-video-outfit-media">
              <img src={card.image} alt={card.title} loading="lazy" />
            </div>
            <div className="su-video-outfit-body">
              <span className={`su-temp-pill is-${card.badge.toLowerCase()}`}>{card.badge}</span>
              <strong>{card.title}</strong>
              <small>{card.subtitle}</small>
              <p className="su-video-outfit-price">{card.price}</p>
              <div className="su-video-outfit-swatches" aria-hidden="true">
                {card.swatches.map((hex, idx) => (
                  <i key={hex + idx} style={{ backgroundColor: hex }} />
                ))}
              </div>
              <button type="button" className="su-cuetrar-btn" onClick={onNavigateOutfits}>
                Ver conjunto
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Vista de la sub-pestaña "Similar": consume el catálogo de la API (/api/products)
 * y evalúa la afinidad por cuenta (/api/purchase-recommendations) con estado loading/error.
 */
export function StudioSimilarCatalogPanel({
  account,
  onOpenScanner
}: {
  account: AccountSlot;
  onOpenScanner: () => void;
}) {
  const { refreshActiveAccountNetwork } = useMultiAccount();
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, PurchaseRecommendationResponse>>({});
  const [evalError, setEvalError] = useState<string | null>(null);

  const catalogItems = account.network.catalog;

  const handleEvaluate = async (variantId: string) => {
    setEvaluatingId(variantId);
    setEvalError(null);
    try {
      const res = await defaultApiClient.evaluateProductVariant(account.accountId, variantId);
      setDecisions(prev => ({ ...prev, [variantId]: res }));
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'No se pudo valorar esta variante.');
    } finally {
      setEvaluatingId(null);
    }
  };

  return (
    <section className="su-similar-panel" aria-label="Tonos similares y catálogo verificado">
      <div className="su-section-head">
        <div>
          <h2>Tonos similares en catálogo</h2>
          <p>
            Datos sincronizados para la cuenta <span data-private>{account.profileData.name}</span> (Perfil v
            {account.profileData.version} · {REQUIRED_FILE_VERSION}).
          </p>
        </div>
        <button
          type="button"
          className="su-mini"
          onClick={() => refreshActiveAccountNetwork()}
          disabled={account.network.loading}
        >
          {account.network.loading ? 'Sincronizando…' : 'Revalidar API'}
        </button>
      </div>

      {account.network.error && (
        <p className="su-empty" role="alert">
          Aviso de red: {account.network.error}
        </p>
      )}
      {evalError && (
        <p className="su-empty" role="alert">
          {evalError}
        </p>
      )}

      <div className="su-products">
        {catalogItems.length > 0
          ? catalogItems.map(item => {
              const decision = decisions[item._id];
              return (
                <article key={item._id} className="su-product">
                  <div className="su-product-swatch-hero" style={{ backgroundColor: isHex(item.hex) ? item.hex : '#D5B5AB' }} />
                  <div>
                    <strong>
                      {item.product?.brand || 'Marca'} · {item.product?.name || 'Producto'}
                    </strong>
                    <small>
                      Tono {item.shade} · Mercado {item.market}
                    </small>
                    {decision && (
                      <small className="su-decision-note">
                        {decision.label}: {decision.reasons?.[0] || ''}
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    className="su-mini"
                    onClick={() => handleEvaluate(item._id)}
                    disabled={evaluatingId === item._id}
                  >
                    {evaluatingId === item._id ? 'Valorando…' : 'Valorar afinidad'}
                  </button>
                </article>
              );
            })
          : products.map(product => (
              <article key={product.id} className="su-product">
                <img src={product.image} alt={product.name} loading="lazy" />
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.note}</small>
                </div>
                <span className="su-match">
                  <i style={{ background: product.swatch }} />
                  {account.analysis?.colorimetry.season || 'Tu paleta'}
                </span>
              </article>
            ))}
      </div>

      <div className="su-similar-cta">
        <button type="button" className="su-button su-button-primary" onClick={onOpenScanner}>
          <CameraIcon /> Escanear otro producto en tienda
        </button>
      </div>
    </section>
  );
}

/**
 * Vista de la sub-pestaña "Collage": incluye el panel de subida rápida y validación
 * de versión de archivo v2.0 (00:02 del vídeo) + la tarjeta flotante MyPage con retrato
 * estilizado por el pipeline (00:08-00:09 del vídeo).
 */
export function StudioCollageMyPagePanel({
  account,
  onOpenConsultation,
  onDownloadPalette
}: {
  account: AccountSlot;
  onOpenConsultation: () => void;
  onDownloadPalette: () => void;
}) {
  const { importDossierForAccount } = useMultiAccount();
  const [customPreview, setCustomPreview] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string>(
    `Listo para procesar retratos o importar archivos con especificación ${REQUIRED_FILE_VERSION}.`
  );
  const [selectedPaletteMode, setSelectedPaletteMode] = useState('seasonal');
  const [includeFeatures, setIncludeFeatures] = useState(true);

  const palette = (account.analysis?.colorimetry.palette || []).filter(isHex);
  const effectivePalette = palette.length ? palette : DEFAULT_PALETTE;
  const face = customPreview || account.analysis?.photos?.face;

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = defaultFileSpecPolicy.validateImageFile(file);
    if (!validation.valid) {
      setStatusMessage(validation.reason || 'Archivo no válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPreview(reader.result);
        setStatusMessage(
          `Retrato validado (${REQUIRED_FILE_VERSION}) y estilizado mediante el pipeline de imagen.`
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDossierImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = importDossierForAccount(account.accountId, reader.result);
        setStatusMessage(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExportDossier = () => {
    const baseAnalysis = account.analysis || {
      colorimetry: { season: 'Otoño Cálido', palette: effectivePalette }
    };
    const stamped = defaultFileSpecPolicy.stampDossierExport(
      baseAnalysis as unknown as Record<string, unknown>,
      account.accountId
    );
    const blob = new Blob([JSON.stringify(stamped, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stylingu-dossier-${REQUIRED_FILE_VERSION}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMessage(`Dossier exportado con versión ${REQUIRED_FILE_VERSION}.`);
  };

  return (
    <section className="su-collage-mypage" aria-label="Estudio de subida de foto, paleta y vista MyPage">
      <div className="su-collage-grid">
        {/* Tarjeta izquierda: Upload your photo + Palette setup (00:02 y 00:08 del vídeo) */}
        <article className="su-card su-upload-setup-card">
          <div className="su-upload-head">
            <div>
              <p className="su-kicker">Pipeline de Imagen &amp; Validación</p>
              <h2>Sube y estiliza tu retrato</h2>
            </div>
            <FileVersionBadge compact />
          </div>

          <label className="su-upload-dropzone">
            <CameraIcon />
            <strong>Upload your photo · Añadir selfie</strong>
            <small>{defaultFileSpecPolicy.getMetadata().formatsLabel}</small>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoUpload}
              className="su-sr-only"
            />
            <span className="su-upload-pill">Seleccionar retrato ({REQUIRED_FILE_VERSION})</span>
          </label>

          <div className="su-palette-setup">
            <label className="su-setup-field">
              <span>Configuración de paleta (Palette setup)</span>
              <select
                value={selectedPaletteMode}
                onChange={e => setSelectedPaletteMode(e.target.value)}
              >
                <option value="seasonal">Armonía estacional completa ({REQUIRED_FILE_VERSION})</option>
                <option value="warm-focus">Prioridad cálida (Terracota &amp; Oro)</option>
                <option value="cool-studio">Contraste de estudio (Violeta &amp; Cobalto)</option>
              </select>
            </label>

            <label className="su-setup-check">
              <input
                type="checkbox"
                checked={includeFeatures}
                onChange={e => setIncludeFeatures(e.target.checked)}
              />
              <span>Aplicar normalización lumínica, recorte 1:1 y borde suavizado</span>
            </label>
          </div>

          <p className="su-upload-status" role="status" aria-live="polite">
            {statusMessage}
          </p>

          <div className="su-upload-actions">
            <button type="button" className="su-button su-button-primary" onClick={onOpenConsultation}>
              Guardar y analizar en servidor <ArrowIcon />
            </button>
            <button type="button" className="su-button" onClick={handleExportDossier}>
              Exportar archivo {REQUIRED_FILE_VERSION}
            </button>
            <label className="su-button">
              Importar {REQUIRED_FILE_VERSION}
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleDossierImport}
                className="su-sr-only"
              />
            </label>
          </div>
        </article>

        {/* Tarjeta derecha: Vista previa móvil MyPage + trazos de paleta (00:08-00:09 del vídeo) */}
        <article className="su-card su-mypage-showcase">
          <div className="su-mypage-strokes">
            <p className="su-kicker">Vista previa de estudio</p>
            <h3>Tu tarjeta MyPage estilizada</h3>
            <p className="su-muted">
              Cualquier foto de entrada se recorta, equilibra en contraste y estiliza antes de mostrarse.
            </p>
            <div className="su-swatch-strokes" aria-label="Trazos de tu paleta">
              {effectivePalette.slice(0, 4).map((hex, i) => (
                <span key={hex + i} className="su-swatch-stroke" style={{ backgroundColor: hex }} />
              ))}
            </div>
            <button type="button" className="su-puncar-btn" onClick={onDownloadPalette}>
              Probar y descargar color
            </button>
          </div>

          <div className="su-mypage-phone" aria-label="Vista previa móvil MyPage">
            <div className="su-mypage-phone-top">
              <span className="su-mypage-handle" data-private>
                MyPage · {account.profileData.handle || '@stylingu'}
              </span>
              <span className="su-mypage-ver">{REQUIRED_FILE_VERSION}</span>
            </div>
            <StylizedProfileAvatar
              accountId={account.accountId}
              name={account.profileData.name}
              rawPhoto={face}
              preset="mypage-card"
              theme={account.theme}
              accentHex={effectivePalette[0]}
              alt="Retrato de perfil estilizado en tarjeta MyPage"
            />
            <div className="su-mypage-phone-foot">
              <span>{account.analysis?.colorimetry.season || 'Armonía Personal'}</span>
              <div className="su-mypage-dots" aria-hidden="true">
                {effectivePalette.slice(0, 4).map((hex, idx) => (
                  <i key={hex + idx} style={{ backgroundColor: hex }} />
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/**
 * Desglose completo de TODAS las subgamas cromáticas de la cuenta activa
 * (Base, Medios, Acentos, Profundos, Iluminadores y Tonos a Distanciar) sin recortes.
 */
export function PersonalColorimetryAllRanges({
  account,
  selectedSwatch,
  onSelectSwatch
}: {
  account: AccountSlot;
  selectedSwatch: string;
  onSelectSwatch: (hex: string) => void;
}) {
  const breakdown = useMemo(
    () => defaultColorimetryAtlas.buildPersonalBreakdown(account.analysis),
    [account.analysis]
  );
  const [activeRange, setActiveRange] = useState<'all' | ColorSubRangeKey>('all');

  const totalCount =
    breakdown.allHarmoniousSwatches.length + breakdown.ranges.evitar.length;

  const visibleRanges = useMemo(() => {
    if (activeRange === 'all') {
      return SUBRANGE_METADATA;
    }
    return SUBRANGE_METADATA.filter(meta => meta.key === activeRange);
  }, [activeRange]);

  return (
    <section
      className="su-section su-all-ranges-section"
      aria-label="Todas las gamas de tu colorimetría"
    >
      <div className="su-section-head su-ranges-head">
        <div>
          <p className="su-kicker">Espectro Cromático Completo</p>
          <h2>Todas las gamas de tu colorimetría ({totalCount} tonos)</h2>
          <p>
            Sin selección reducida: explora todos tus neutros base, tonos medios, acentos,
            profundos de sastrería, iluminadores faciales y contrastes a distanciar.
          </p>
        </div>
        <div className="su-metals-pills" aria-label="Metales recomendados">
          {breakdown.matchedSeason.metals.map(metal => (
            <span key={metal} className="su-metal-pill">
              ✦ {metal}
            </span>
          ))}
        </div>
      </div>

      <div className="su-range-filter-bar" role="tablist" aria-label="Filtrar por subgama cromática">
        <button
          type="button"
          role="tab"
          aria-selected={activeRange === 'all'}
          className={`su-range-chip ${activeRange === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveRange('all')}
        >
          Todas las gamas ({totalCount})
        </button>
        {SUBRANGE_METADATA.map(meta => {
          const count =
            meta.key === 'evitar'
              ? breakdown.ranges.evitar.length
              : breakdown.ranges[meta.key].length;
          return (
            <button
              key={meta.key}
              type="button"
              role="tab"
              aria-selected={activeRange === meta.key}
              className={`su-range-chip ${activeRange === meta.key ? 'is-active' : ''}`}
              onClick={() => setActiveRange(meta.key)}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="su-ranges-stack">
        {visibleRanges.map(meta => {
          if (meta.key === 'evitar') {
            const items = breakdown.ranges.evitar;
            return (
              <article key={meta.key} className="su-card su-range-group-card">
                <header className="su-range-group-head">
                  <div>
                    <h3>{meta.label}</h3>
                    <p>{meta.subtitle}</p>
                  </div>
                  <span className="su-range-count-badge">{items.length} tonos</span>
                </header>
                <div className="su-avoid su-avoid-full">
                  {items.map((item, idx) => (
                    <figure key={item.hex + idx}>
                      <span style={{ background: item.hex }} />
                      <figcaption>
                        <strong>
                          {item.name} · <code>{item.hex.toUpperCase()}</code>
                        </strong>
                        <small>{item.why}</small>
                        <small className="su-avoid-alt">Alternativa: {item.alt}</small>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </article>
            );
          }

          const swatches = breakdown.ranges[meta.key];
          return (
            <article key={meta.key} className="su-card su-range-group-card">
              <header className="su-range-group-head">
                <div>
                  <h3>{meta.label}</h3>
                  <p>{meta.subtitle}</p>
                </div>
                <span className="su-range-count-badge">{swatches.length} tonos</span>
              </header>
              <div className="su-range-swatch-grid">
                {swatches.map((swatch, idx) => {
                  const isSelected =
                    selectedSwatch.toUpperCase() === swatch.hex.toUpperCase();
                  return (
                    <button
                      key={swatch.hex + idx}
                      type="button"
                      className={`su-range-swatch-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onSelectSwatch(swatch.hex)}
                      aria-label={`Seleccionar ${swatch.name} (${swatch.hex})`}
                    >
                      <span
                        className="su-range-swatch-color"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <div className="su-range-swatch-info">
                        <strong>{swatch.name}</strong>
                        <code>{swatch.hex.toUpperCase()}</code>
                        <small>{swatch.usage}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Atlas Completo de las 12 Estaciones de Colorimetría (Primavera, Verano, Otoño e Invierno)
 * con todas las gamas de cada estación y comparación directa en la rueda cromática.
 */
export function CompleteColorimetryAtlasSection({
  activeUserSeasonName,
  comparedSeasonId,
  onCompareSeasonInWheel,
  onSelectSwatch
}: {
  activeUserSeasonName?: string;
  comparedSeasonId?: string;
  onCompareSeasonInWheel: (seasonId: string) => void;
  onSelectSwatch: (hex: string) => void;
}) {
  const [familyFilter, setFamilyFilter] = useState<'all' | SeasonFamilyKey>('all');
  const seasons = useMemo(
    () => defaultColorimetryAtlas.getSeasonsByFamily(familyFilter),
    [familyFilter]
  );
  const matchedUserSeason = useMemo(
    () => defaultColorimetryAtlas.findSeason(activeUserSeasonName),
    [activeUserSeasonName]
  );

  const renderSeasonCard = (season: SeasonColorimetrySpec) => {
    const isUserSeason = season.id === matchedUserSeason.id;
    const isCompared = season.id === comparedSeasonId;
    const harmoniousCount =
      defaultColorimetryAtlas.getAllHarmoniousSwatchesForSeason(season).length;

    return (
      <article
        key={season.id}
        className={`su-card su-atlas-season-card ${isUserSeason ? 'is-user-season' : ''} ${
          isCompared ? 'is-compared-season' : ''
        }`}
      >
        <header className="su-atlas-card-head">
          <div>
            <div className="su-atlas-badges">
              <span className="su-atlas-family-pill">{season.familyLabel}</span>
              <span className="su-atlas-meta-pill">Subtono {season.temperature}</span>
              <span className="su-atlas-meta-pill">Contraste {season.contrast}</span>
              {isUserSeason && (
                <span className="su-atlas-user-pill">★ Tu estación actual</span>
              )}
            </div>
            <h3>{season.name}</h3>
            <p className="su-atlas-desc">{season.description}</p>
          </div>
          <button
            type="button"
            className={`su-button ${isCompared ? 'su-button-primary' : ''}`}
            onClick={() => onCompareSeasonInWheel(season.id)}
          >
            {isCompared ? 'Comparando en rueda' : 'Comparar en rueda'}
          </button>
        </header>

        <div className="su-atlas-subranges">
          {(
            [
              ['Base y Neutros', season.ranges.base],
              ['Tonos Medios', season.ranges.medios],
              ['Acentos Vibrantes', season.ranges.acentos],
              ['Profundos', season.ranges.profundos],
              ['Iluminadores', season.ranges.iluminadores]
            ] as const
          ).map(([groupTitle, list]) => (
            <div key={groupTitle} className="su-atlas-subrange-block">
              <div className="su-atlas-subrange-title">
                <strong>{groupTitle}</strong>
                <span>{list.length} tonos</span>
              </div>
              <div className="su-atlas-mini-grid">
                {list.map(sw => (
                  <button
                    key={sw.hex + sw.name}
                    type="button"
                    className="su-atlas-swatch-chip"
                    onClick={() => onSelectSwatch(sw.hex)}
                    title={`${sw.name} (${sw.hex}) · ${sw.usage}`}
                    aria-label={`${season.name} - ${sw.name} ${sw.hex}`}
                  >
                    <span
                      className="su-atlas-swatch-dot"
                      style={{ backgroundColor: sw.hex }}
                    />
                    <span className="su-atlas-swatch-text">
                      <strong>{sw.name}</strong>
                      <small>{sw.hex}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="su-atlas-subrange-block su-atlas-avoid-block">
            <div className="su-atlas-subrange-title">
              <strong>Tonos a Distanciar en {season.name}</strong>
              <span>{season.ranges.evitar.length} tonos</span>
            </div>
            <div className="su-atlas-mini-grid">
              {season.ranges.evitar.map(av => (
                <div key={av.hex + av.name} className="su-atlas-avoid-chip">
                  <span
                    className="su-atlas-swatch-dot"
                    style={{ backgroundColor: av.hex }}
                  />
                  <span className="su-atlas-swatch-text">
                    <strong>
                      {av.name} ({av.hex})
                    </strong>
                    <small>Alternativa: {av.alt}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="su-atlas-card-foot">
          <span>
            <strong>Joyería ideal:</strong> {season.metals.join(' · ')}
          </span>
          <span>
            <strong>Total gama:</strong> {harmoniousCount} tonos armónicos +{' '}
            {season.ranges.evitar.length} a evitar
          </span>
        </footer>
      </article>
    );
  };

  return (
    <section
      className="su-section su-atlas-section"
      aria-label="Atlas Completo de las 12 Estaciones de Colorimetría"
    >
      <div className="su-section-head">
        <div>
          <p className="su-kicker">Sistema Estacional de 12 Gamas</p>
          <h2>Atlas Completo de Colorimetría (Las 12 Estaciones)</h2>
          <p>
            Todas las estaciones cromáticas (Primavera, Verano, Otoño e Invierno en sus variantes
            Clara, Cálida/Fría, Suave, Profunda y Brillante) con la totalidad de sus gamas.
          </p>
        </div>
      </div>

      <div
        className="su-range-filter-bar"
        role="tablist"
        aria-label="Filtrar las 12 estaciones por familia"
      >
        {(
          [
            ['all', 'Todas las 12 estaciones (252 tonos)'],
            ['primavera', 'Primavera · 3 gamas'],
            ['verano', 'Verano · 3 gamas'],
            ['otono', 'Otoño · 3 gamas'],
            ['invierno', 'Invierno · 3 gamas']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={familyFilter === key}
            className={`su-range-chip ${familyFilter === key ? 'is-active' : ''}`}
            onClick={() => setFamilyFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="su-atlas-grid">{seasons.map(renderSeasonCard)}</div>
    </section>
  );
}

function EyewearFrameSvg({ style }: { style: EyewearFrameStyle }) {
  switch (style) {
    case 'cat-eye':
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <path
            d="M10 18 Q28 8 56 18 Q62 28 50 36 Q26 38 14 26 Z M130 18 Q112 8 84 18 Q78 28 90 36 Q114 38 126 26 Z"
            fill="rgba(212, 163, 115, 0.16)"
            stroke="currentColor"
            strokeWidth="2.8"
          />
          <path d="M56 19 Q70 15 84 19" fill="none" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      );
    case 'aviator':
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <path
            d="M14 14 H58 Q62 34 42 40 Q16 38 14 20 Z M82 14 H126 Q124 38 98 40 Q78 34 82 14 Z"
            fill="rgba(212, 163, 115, 0.14)"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path d="M56 14 H84 M58 19 H82" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 'pantos-round':
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <circle
            cx="38"
            cy="25"
            r="17"
            fill="rgba(212, 163, 115, 0.14)"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <circle
            cx="102"
            cy="25"
            r="17"
            fill="rgba(212, 163, 115, 0.14)"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path d="M55 22 Q70 16 85 22" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case 'clubmaster':
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <path d="M12 15 Q36 10 58 16 M82 16 Q104 10 128 15" stroke="currentColor" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path
            d="M16 16 Q18 38 38 38 Q56 38 56 17 M84 17 Q84 38 102 38 Q122 38 124 16"
            fill="rgba(212, 163, 115, 0.12)"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M56 18 H84" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case 'oversize-geometric':
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <polygon
            points="14,12 56,12 60,26 48,40 20,40 12,26"
            fill="rgba(212, 163, 115, 0.15)"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <polygon
            points="84,12 126,12 128,26 120,40 92,40 80,26"
            fill="rgba(212, 163, 115, 0.15)"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path d="M58 18 H82" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 140 48" className="su-eyewear-svg" aria-hidden="true">
          <rect
            x="14"
            y="13"
            width="44"
            height="24"
            rx="6"
            fill="rgba(212, 163, 115, 0.16)"
            stroke="currentColor"
            strokeWidth="2.6"
          />
          <rect
            x="82"
            y="13"
            width="44"
            height="24"
            rx="6"
            fill="rgba(212, 163, 115, 0.16)"
            stroke="currentColor"
            strokeWidth="2.6"
          />
          <path d="M58 19 H82" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      );
  }
}

/**
 * Guía Integral de Visagismo:
 * 1) ¿Dorado o Plata? · ¿Cálida o Fría? · ¿Contraste Alto, Medio o Bajo?
 * 2) Qué gafas favorecen según la forma de cara (con las 6 formas explorables).
 * 3) Posicionamiento anatómico de Contouring, Iluminador y Rubor con mapa facial y referencia real.
 */
export function VisagismContouringAndEyewearGuide({ account }: { account: AccountSlot }) {
  const allShapes = useMemo(() => defaultVisagismGuide.getAllFaceShapes(), []);
  const detectedShape = useMemo(
    () => defaultVisagismGuide.resolveFaceShape(account.analysis?.makeup?.faceShape),
    [account.analysis?.makeup?.faceShape]
  );
  const [selectedShapeKey, setSelectedShapeKey] = useState<FaceShapeKey>(detectedShape.key);
  const [zoneFilter, setZoneFilter] = useState<'all' | 'contour' | 'highlight' | 'blush'>('all');
  const [showGlassesOverlay, setShowGlassesOverlay] = useState(false);

  const activeShape = useMemo(
    () => allShapes.find(s => s.key === selectedShapeKey) || detectedShape,
    [allShapes, selectedShapeKey, detectedShape]
  );

  const diagnosis = useMemo(
    () => defaultVisagismGuide.buildThermalMetalAndContrastDiagnosis(account.analysis),
    [account.analysis]
  );

  const visibleZones = useMemo(
    () =>
      activeShape.contouringGuide.zones.filter(
        z => zoneFilter === 'all' || z.type === zoneFilter
      ),
    [activeShape, zoneFilter]
  );

  return (
    <section
      className="su-section su-visagism-section"
      aria-label="Guía de Visagismo: Dorado o Plata, Temperatura, Contraste, Gafas y Contouring"
    >
      <div className="su-section-head">
        <div>
          <p className="su-kicker">Diagnóstico Óptico, Joyería, Gafas &amp; Esculpido Facial</p>
          <h2>Guía de Metales, Subtono, Contraste, Gafas y Contouring</h2>
          <p>
            Descubre si te favorece más el dorado o la plata, si tu armonía es cálida o fría, tu
            nivel de contraste, las monturas de gafas para tu rostro y el mapa exacto de contouring.
          </p>
        </div>
      </div>

      {/* 1. TRÍPTICO DE DIAGNÓSTICO: DORADO VS PLATA · CÁLIDA VS FRÍA · CONTRASTE */}
      <div className="su-diagnosis-triptych">
        {/* Tarjeta A: ¿Dorado o Plata? */}
        <article className="su-card su-diag-card">
          <span className="su-kicker">01 · Guía de Joyería y Metales</span>
          <h3>¿Dorado o Plata?</h3>
          <p className="su-diag-verdict">{diagnosis.metalWinner}</p>
          <div className="su-metal-medallions" role="list" aria-label="Afinidad con metales">
            <div className="su-metal-medallion" role="listitem">
              <span
                className="su-metal-disc su-metal-gold"
                aria-hidden="true"
              />
              <div>
                <strong>Dorado / Oro</strong>
                <small>{diagnosis.goldAffinity}% afinidad</small>
              </div>
            </div>
            <div className="su-metal-medallion" role="listitem">
              <span
                className="su-metal-disc su-metal-silver"
                aria-hidden="true"
              />
              <div>
                <strong>Plata / Platino</strong>
                <small>{diagnosis.silverAffinity}% afinidad</small>
              </div>
            </div>
            <div className="su-metal-medallion" role="listitem">
              <span
                className="su-metal-disc su-metal-rosegold"
                aria-hidden="true"
              />
              <div>
                <strong>Oro Rosa / Champán</strong>
                <small>{diagnosis.roseGoldAffinity}% afinidad</small>
              </div>
            </div>
          </div>
          <p className="su-diag-body">{diagnosis.metalExplanation}</p>
          <p className="su-diag-tip">
            <strong>En tus gafas:</strong> {diagnosis.eyewearMetalTip}
          </p>
        </article>

        {/* Tarjeta B: ¿Cálida o Fría? */}
        <article className="su-card su-diag-card">
          <span className="su-kicker">02 · Temperatura Dérmica</span>
          <h3>¿Cálida o Fría?</h3>
          <p className="su-diag-verdict">Armonía {diagnosis.temperatureCategory}</p>
          <div className="su-thermal-meter" aria-label="Escala térmica Fría a Cálida">
            <div className="su-thermal-labels">
              <span>Fría (Azulada/Rosada)</span>
              <strong>{diagnosis.temperatureScoreWarm}% Cálida</strong>
              <span>Cálida (Dorada/Melocotón)</span>
            </div>
            <div className="su-thermal-bar">
              <span
                className="su-thermal-marker"
                style={{ left: `${diagnosis.temperatureScoreWarm}%` }}
              />
            </div>
          </div>
          <p className="su-diag-body">{diagnosis.temperatureExplanation}</p>
        </article>

        {/* Tarjeta C: ¿Contraste Alto, Medio o Bajo? */}
        <article className="su-card su-diag-card">
          <span className="su-kicker">03 · Escala de Luminancia</span>
          <h3>¿Contraste Alto, Medio o Bajo?</h3>
          <p className="su-diag-verdict">{diagnosis.contrastLevel}</p>
          <div className="su-contrast-scale" aria-label="Nivel de contraste personal">
            {(
              [
                ['Contraste Bajo', 'Suave · Tonal'],
                ['Contraste Medio', 'Equilibrado'],
                ['Contraste Alto', 'Intenso · Nítido']
              ] as const
            ).map(([level, tag]) => (
              <div
                key={level}
                className={`su-contrast-pill ${
                  diagnosis.contrastLevel === level ? 'is-active' : ''
                }`}
              >
                <strong>{level.replace('Contraste ', '')}</strong>
                <small>{tag}</small>
              </div>
            ))}
          </div>
          <p className="su-diag-body">{diagnosis.contrastExplanation}</p>
          <p className="su-diag-tip">
            <strong>Regla al vestir:</strong> {diagnosis.contrastStylingRule}
          </p>
        </article>
      </div>

      {/* 2. SELECTOR INTERACTIVO DE FORMA DE CARA */}
      <div className="su-card su-faceshape-bar">
        <div className="su-faceshape-bar-head">
          <div>
            <span className="su-kicker">Morfología Facial</span>
            <h3>
              Selecciona la forma de rostro ({activeShape.label}
              {activeShape.key === detectedShape.key ? ' · Detectada en tu perfil' : ''})
            </h3>
          </div>
          <button
            type="button"
            className={`su-button ${showGlassesOverlay ? 'su-button-primary' : ''}`}
            onClick={() => setShowGlassesOverlay(prev => !prev)}
          >
            {showGlassesOverlay ? 'Ocultar gafas en el mapa' : 'Probar montura sobre el mapa'}
          </button>
        </div>
        <div className="su-range-filter-bar" role="tablist" aria-label="Formas de rostro">
          {allShapes.map(shape => (
            <button
              key={shape.key}
              type="button"
              role="tab"
              aria-selected={activeShape.key === shape.key}
              className={`su-range-chip ${activeShape.key === shape.key ? 'is-active' : ''}`}
              onClick={() => setSelectedShapeKey(shape.key)}
            >
              {shape.label}
              {shape.key === detectedShape.key ? ' ★' : ''}
            </button>
          ))}
        </div>
        <p className="su-faceshape-summary">
          <strong>Proporción:</strong> {activeShape.proportionsSummary}{' '}
          <strong>Objetivo óptico:</strong> {activeShape.opticalGoal}
        </p>
      </div>

      {/* 3. PANEL DOBLE: MAPA ANATÓMICO DE CONTOURING + GUÍA DE GAFAS */}
      <div className="su-visagism-main-grid">
        {/* Columna Izquierda: Posicionamiento de Contouring, Rubor e Iluminador */}
        <article className="su-card su-contouring-card">
          <header className="su-range-group-head">
            <div>
              <span className="su-kicker">Mapa Anatómico Facial</span>
              <h3>Posicionamiento de Contouring, Iluminador y Rubor ({activeShape.label})</h3>
              <p>{activeShape.contouringGuide.summary}</p>
            </div>
          </header>

          <div className="su-range-filter-bar" role="group" aria-label="Filtrar capas del mapa">
            {(
              [
                ['all', 'Todas las capas'],
                ['contour', 'Contouring / Bronzer'],
                ['highlight', 'Iluminador / Luz'],
                ['blush', 'Rubor / Blush']
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`su-range-chip ${zoneFilter === key ? 'is-active' : ''}`}
                onClick={() => setZoneFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="su-contour-visual-row">
            {/* Diagrama SVG Anatómico de Contouring */}
            <div className="su-contour-diagram-wrap">
              <svg
                viewBox="0 0 240 250"
                className="su-contour-svg"
                role="img"
                aria-label={`Mapa de posicionamiento de contouring para ${activeShape.label}`}
              >
                <defs>
                  <radialGradient id="skinBaseGrad" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="#F5DEC9" />
                    <stop offset="100%" stopColor="#DEC0A6" />
                  </radialGradient>
                </defs>

                {/* Cuello base */}
                <path
                  d="M 92 204 L 86 244 L 154 244 L 148 204 Z"
                  fill="#D5B499"
                  stroke="#B8967A"
                  strokeWidth="1.2"
                />

                {/* Contorno de la cara según la forma */}
                <path
                  d={activeShape.faceOutlinePath}
                  fill="url(#skinBaseGrad)"
                  stroke="#8D6B53"
                  strokeWidth="2"
                />

                {/* Líneas guía de tercios faciales */}
                <line x1="38" y1="88" x2="202" y2="88" stroke="rgba(90,65,50,0.18)" strokeDasharray="3 3" />
                <line x1="38" y1="144" x2="202" y2="144" stroke="rgba(90,65,50,0.18)" strokeDasharray="3 3" />
                <line x1="120" y1="16" x2="120" y2="232" stroke="rgba(90,65,50,0.18)" strokeDasharray="3 3" />

                {/* Facciones anatómicas (Cejas, ojos, nariz, labios) */}
                <g stroke="#594134" fill="none" strokeLinecap="round">
                  {/* Cejas */}
                  <path d="M 74 84 Q 90 75 106 82" strokeWidth="2.6" />
                  <path d="M 134 82 Q 150 75 166 84" strokeWidth="2.6" />
                  {/* Ojos */}
                  <ellipse cx="90" cy="96" rx="11" ry="5.5" fill="#FFFDF9" strokeWidth="1.5" />
                  <circle cx="90" cy="96" r="4" fill="#5C4033" />
                  <ellipse cx="150" cy="96" rx="11" ry="5.5" fill="#FFFDF9" strokeWidth="1.5" />
                  <circle cx="150" cy="96" r="4" fill="#5C4033" />
                  {/* Nariz */}
                  <path d="M 113 138 Q 120 144 127 138" strokeWidth="1.6" />
                  {/* Labios */}
                  <path
                    d="M 100 168 Q 112 162 120 166 Q 128 162 140 168 Q 128 178 120 178 Q 112 178 100 168 Z"
                    fill="#C97A6E"
                    stroke="#8E4A40"
                    strokeWidth="1.2"
                  />
                </g>

                {/* Zonas de Contouring, Rubor e Iluminador */}
                {visibleZones.map(zone => {
                  const fill =
                    zone.type === 'contour'
                      ? 'rgba(110, 66, 44, 0.62)'
                      : zone.type === 'highlight'
                      ? 'rgba(255, 248, 214, 0.82)'
                      : 'rgba(218, 114, 102, 0.56)';
                  const stroke =
                    zone.type === 'contour'
                      ? '#5A3422'
                      : zone.type === 'highlight'
                      ? '#D4A843'
                      : '#B84A3E';
                  return (
                    <path
                      key={zone.id}
                      d={zone.d}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth="1.2"
                      strokeDasharray={zone.type === 'highlight' ? '2 2' : undefined}
                    >
                      <title>{zone.label}</title>
                    </path>
                  );
                })}

                {/* Superposición opcional de la montura de gafas ideal */}
                {showGlassesOverlay && (
                  <g stroke="#2B211E" strokeWidth="2.8" fill="rgba(255,255,255,0.14)">
                    <rect x="64" y="82" width="46" height="28" rx="8" />
                    <rect x="130" y="82" width="46" height="28" rx="8" />
                    <path d="M 110 92 H 130" />
                  </g>
                )}
              </svg>

              <div className="su-contour-legend" aria-label="Leyenda del mapa de contouring">
                <span>
                  <i className="su-legend-dot su-legend-contour" /> Contouring (Sombra/Definición)
                </span>
                <span>
                  <i className="su-legend-dot su-legend-highlight" /> Iluminador (Volumen/Luz)
                </span>
                <span>
                  <i className="su-legend-dot su-legend-blush" /> Rubor (Foco ascendente)
                </span>
              </div>
            </div>

            {/* Referencia fotográfica real y zonas detalladas */}
            <div className="su-contour-details">
              <div className="su-contour-photo-ref">
                <img
                  src="./assets/svg-design/makeup.jpg"
                  alt="Referencia real de luz en pómulo, puente nasal y contorno suave"
                  loading="lazy"
                />
                <img
                  src="./assets/pasos/paso-4.jpg"
                  alt="Detalle de transición entre contorno, rubor e iluminador en el pómulo"
                  loading="lazy"
                />
              </div>

              <dl className="su-contour-dl">
                <div>
                  <dt>● Contouring (Sombra Escultora)</dt>
                  <dd>{activeShape.contouringGuide.contourWhere}</dd>
                </div>
                <div>
                  <dt>✦ Iluminador (Puntos de Luz)</dt>
                  <dd>{activeShape.contouringGuide.highlightWhere}</dd>
                </div>
                <div>
                  <dt>♥ Rubor / Blush</dt>
                  <dd>{activeShape.contouringGuide.blushWhere}</dd>
                </div>
              </dl>

              <ol className="su-contour-steps">
                {activeShape.contouringGuide.stepByStep.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </article>

        {/* Columna Derecha: Guía de Gafas según su Forma de Cara */}
        <article className="su-card su-eyewear-card">
          <header className="su-range-group-head">
            <div>
              <span className="su-kicker">Óptica &amp; Proporción Facial</span>
              <h3>Qué gafas te favorecen ({activeShape.label})</h3>
              <p>
                Monturas seleccionadas para equilibrar el tercio superior, medio e inferior de tu
                rostro.
              </p>
            </div>
          </header>

          <div className="su-eyewear-list">
            {activeShape.eyewearRecommended.map(frame => (
              <div key={frame.id} className="su-eyewear-item">
                <div className="su-eyewear-illustration">
                  <EyewearFrameSvg style={frame.id} />
                  <span className="su-eyewear-score">{frame.fitScore}% Fit</span>
                </div>
                <div className="su-eyewear-copy">
                  <strong>{frame.name}</strong>
                  <p>{frame.why}</p>
                  <small>
                    <strong>Ajuste recomendado:</strong> {frame.bridgeAndRimTip}
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div className="su-eyewear-avoid-box">
            <strong>Monturas a evitar en {activeShape.label}:</strong>
            <ul>
              {activeShape.eyewearAvoid.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}



