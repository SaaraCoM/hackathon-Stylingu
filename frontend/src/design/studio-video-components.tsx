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
  return Array.from({ length: 12 }, (_, idx) => source[idx % source.length]);
}

function buildWheelSegments(tones: string[], cx = 110, cy = 110, rOuter = 98, rInner = 54) {
  return tones.map((hex, index) => {
    const startAngle = ((index * 30 - 90) * Math.PI) / 180;
    const endAngle = (((index + 1) * 30 - 90) * Math.PI) / 180;
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
 * Soporta comparar la armonía cálida/fría de la cuenta activa o comparar dos cuentas en vivo.
 */
export function ColorWheelComparator({
  primaryAccount,
  peerAccount,
  toneFilter = 'all'
}: {
  primaryAccount: AccountSlot;
  peerAccount: AccountSlot;
  toneFilter?: 'all' | 'warm' | 'cold';
}) {
  const [harmonyBalance, setHarmonyBalance] = useState(25);
  const [compareAccountsMode, setCompareAccountsMode] = useState(false);
  const [selectedHex, setSelectedHex] = useState<string>(() => {
    const first = primaryAccount.analysis?.colorimetry.palette?.[0];
    return isHex(first) ? first : DEFAULT_PALETTE[0];
  });

  const warmPalette = useMemo(() => {
    const own = (primaryAccount.analysis?.colorimetry.palette || []).filter(isHex);
    return own.length ? own : DEFAULT_PALETTE;
  }, [primaryAccount.analysis]);

  const coldPalette = useMemo(() => {
    if (compareAccountsMode) {
      const peer = (peerAccount.analysis?.colorimetry.palette || []).filter(isHex);
      if (peer.length) return peer;
    }
    return COLD_WHEEL_TONES.slice(0, 6);
  }, [compareAccountsMode, peerAccount.analysis]);

  const leftWheelSegments = useMemo(
    () => buildWheelSegments(expandWheelTones(warmPalette, DEFAULT_PALETTE)),
    [warmPalette]
  );

  const rightWheelSegments = useMemo(
    () => buildWheelSegments(expandWheelTones(coldPalette, COLD_WHEEL_TONES)),
    [coldPalette]
  );

  const miniWheelSegments = useMemo(
    () => buildWheelSegments(expandWheelTones([...warmPalette, ...coldPalette], DEFAULT_PALETTE), 36, 36, 32, 14),
    [warmPalette, coldPalette]
  );

  return (
    <section className="su-wheel-comparator" aria-label="Comparador cromático Warm vs Cold">
      <div className="su-wheel-stage">
        {/* Tarjeta izquierda: Armonía cálida / Cuenta principal con ilustración facial */}
        <article
          className={`su-wheel-card ${toneFilter === 'cold' ? 'is-dimmed' : ''}`}
          data-account-id={primaryAccount.accountId}
        >
          <div className="su-wheel-card-top">
            <span className="su-wheel-badge">
              {primaryAccount.analysis?.colorimetry.season || 'Armonía Principal'}
            </span>
            <span className="su-wheel-account su-personal" data-private>
              {primaryAccount.profileData.name}
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
            <span>{primaryAccount.analysis?.colorimetry.temperature || 'Cálido'}</span>
            <strong>Cold</strong>
          </div>

          <div className="su-wheel-strip" role="list" aria-label="Tonos cálidos de la cuenta">
            {warmPalette.slice(0, 6).map((hex, idx) => (
              <button
                key={hex + idx}
                type="button"
                role="listitem"
                className={`su-wheel-swatch ${selectedHex.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}`}
                style={{ backgroundColor: hex }}
                onClick={() => setSelectedHex(hex)}
                aria-label={`Seleccionar tono cálido ${hex}`}
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
            title="Alternar comparación Warm/Cold o Cuenta A vs Cuenta B"
          >
            VS
          </button>
          <small className="su-wheel-vs-caption">
            {compareAccountsMode ? 'Multicuenta' : 'Subtonos'}
          </small>
        </div>

        {/* Tarjeta derecha: Armonía fría / Cuenta comparada (00:03-00:04 del vídeo) */}
        <article
          className={`su-wheel-card su-wheel-card-cold ${toneFilter === 'warm' ? 'is-dimmed' : ''}`}
          data-account-id={compareAccountsMode ? peerAccount.accountId : primaryAccount.accountId}
        >
          <div className="su-wheel-card-top">
            <span className="su-wheel-badge">
              {compareAccountsMode
                ? peerAccount.analysis?.colorimetry.season || 'Perfil Comparado'
                : 'Contraste Frío'}
            </span>
            <span className="su-wheel-account su-personal" data-private>
              {compareAccountsMode ? peerAccount.profileData.name : 'Espectro Cold'}
            </span>
          </div>

          <div className="su-wheel-canvas-wrap">
            <svg
              viewBox="0 0 220 220"
              className="su-wheel-svg"
              role="img"
              aria-label="Rueda cromática de contraste frío"
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
            <strong>Cone</strong>
            <span>{compareAccountsMode ? 'Cuenta B' : 'Contraste'}</span>
            <strong>Cold</strong>
          </div>

          <div className="su-wheel-strip" role="list" aria-label="Tonos fríos de comparación">
            {coldPalette.slice(0, 6).map((hex, idx) => (
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
