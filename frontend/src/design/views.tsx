import type { AccountSlot, StudioSubTab, View } from './types';
import { DEFAULT_PALETTE, looks, makeupTiles, products, routineSteps } from './content';
import {
  ArrowIcon,
  CameraIcon,
  ChevronIcon,
  HangerIcon,
  PaletteIcon,
  SearchIcon,
  SparkleIcon
} from './icons';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  AccountSwitcher,
  FileVersionBadge,
  StylizedProfileAvatar
} from './multi-account';
import {
  ColorimetryOutfitsCarousel,
  ColorWheelComparator,
  CompleteColorimetryAtlasSection,
  MakeupMedallionsRow,
  PersonalColorimetryAllRanges,
  StudioCollageMyPagePanel,
  StudioSimilarCatalogPanel,
  StudioSubTabsBar
} from './studio-video-components';
import { defaultColorimetryAtlas } from './colorimetry-atlas';
import { ToneSimulator } from './tryon/ToneSimulator';

const isHex = (value?: string): value is string => /^#[a-f0-9]{6}$/i.test(value || '');

function paletteOf(account: AccountSlot): string[] {
  const own = (account.analysis?.colorimetry.palette || []).filter(isHex);
  const breakdown = defaultColorimetryAtlas.buildPersonalBreakdown(account.analysis);
  const seasonHexes = breakdown.allHarmoniousSwatches.map(s => s.hex);
  const merged = Array.from(new Set([...own, ...seasonHexes]));
  return merged.length ? merged : DEFAULT_PALETTE;
}

export function ViewHead({
  kicker,
  title,
  description,
  action,
  titleRef
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header className="su-viewhead">
      <div>
        <div className="su-viewhead-meta">
          <p className="su-kicker">{kicker}</p>
          <FileVersionBadge compact />
        </div>
        <h1 ref={titleRef} tabIndex={-1} className="su-title">
          {title}
        </h1>
        {description && <p className="su-lede">{description}</p>}
      </div>
      {action && <div className="su-viewhead-action">{action}</div>}
    </header>
  );
}

export function PaletteStrip({ palette }: { palette: string[] }) {
  return (
    <span className="su-strip" aria-hidden="true">
      {palette.slice(0, 5).map((hex, idx) => (
        <i key={hex + idx} style={{ background: hex }} />
      ))}
    </span>
  );
}

function Photo({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  return (
    <span className={`su-photo ${className}`}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <span className="su-photo-empty" aria-hidden="true" />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ inicio */

export function HomeView({
  account,
  peerAccount,
  navigate,
  onNotify,
  onOpenConsultation,
  titleRef
}: {
  account: AccountSlot;
  peerAccount: AccountSlot;
  navigate: (view: View) => void;
  onNotify: () => void;
  onOpenConsultation: () => void;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const palette = paletteOf(account);
  const face = account.analysis?.photos?.face;
  const [query, setQuery] = useState('');
  const [subTab, setSubTab] = useState<StudioSubTab>('results');
  const [toneFilter, setToneFilter] = useState<'all' | 'warm' | 'cold'>('all');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [homeSwatch, setHomeSwatch] = useState<string>(() => palette[0] || '#E7CE75');

  const q = query.trim().toLowerCase();
  const feed = useMemo(
    () =>
      [
        {
          id: 'look',
          title: 'Terracota de oficina',
          note: 'Tu look de hoy',
          image: looks[0].image,
          view: 'armario' as View
        },
        {
          id: 'routine',
          title: 'Tu rutina en 5 imágenes',
          note: 'Dos minutos, paso a paso',
          image: routineSteps[2].image,
          view: 'makeup' as View
        },
        {
          id: 'shop',
          title: 'Cuatro piezas que encajan',
          note: 'Elegidas con tu paleta',
          image: products[1].image,
          view: 'compras' as View
        }
      ].filter(
        item => !q || item.title.toLowerCase().includes(q) || item.note.toLowerCase().includes(q)
      ),
    [q]
  );

  const cycleFilter = () => {
    setToneFilter(prev => (prev === 'all' ? 'warm' : prev === 'warm' ? 'cold' : 'all'));
  };

  return (
    <>
      <section className="su-greeting">
        <div className="su-greeting-copy">
          <div className="su-greeting-badges">
            <p className="su-hi" data-private>
              Hola, {account.profileData.name || 'tú'}.
            </p>
            <FileVersionBadge compact />
          </div>
          <h1 ref={titleRef} tabIndex={-1} className="su-title su-title-hero">
            Hoy empieza contigo.
          </h1>
        </div>
        <div className="su-greeting-actions">
          <button
            type="button"
            className="su-account-chip"
            onClick={() => setShowSwitcher(prev => !prev)}
            aria-expanded={showSwitcher}
            aria-label="Alternar cuenta o tema visual"
          >
            <span data-private>{account.profileData.name || 'Cuenta'}</span>
            <small>v{account.profileData.version}</small>
          </button>
          <button
            type="button"
            className="su-avatar"
            onClick={onNotify}
            aria-label="Tu cuenta y avisos"
            data-private
          >
            <StylizedProfileAvatar
              accountId={account.accountId}
              name={account.profileData.name}
              rawPhoto={face}
              theme={account.theme}
              accentHex={palette[0]}
            />
          </button>
        </div>
      </section>

      {showSwitcher && <AccountSwitcher onOpenAuthModal={onNotify} />}

      <label className="su-search">
        <SearchIcon />
        <span className="su-sr-only">Buscar inspiración</span>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Busca un look, un tono, una idea…"
        />
        <span className="su-search-filter">Inspirador</span>
      </label>

      {/* Sub-pestañas interactivas del estudio (Results · Similar · Collage) del vídeo */}
      <StudioSubTabsBar
        activeTab={subTab}
        onSelectTab={setSubTab}
        toneFilter={toneFilter}
        onCycleToneFilter={cycleFilter}
      />

      {subTab === 'results' && (
        <>
          <ColorWheelComparator
            primaryAccount={account}
            peerAccount={peerAccount}
            toneFilter={toneFilter}
          />
          <MakeupMedallionsRow account={account} onOpenTryOn={() => navigate('makeup')} />
          <ColorimetryOutfitsCarousel
            account={account}
            onNavigateOutfits={() => navigate('armario')}
          />
          <PersonalColorimetryAllRanges
            account={account}
            selectedSwatch={homeSwatch}
            onSelectSwatch={setHomeSwatch}
          />
        </>
      )}

      {subTab === 'similar' && (
        <StudioSimilarCatalogPanel account={account} onOpenScanner={() => navigate('compras')} />
      )}

      {subTab === 'collage' && (
        <StudioCollageMyPagePanel
          account={account}
          onOpenConsultation={onOpenConsultation}
          onDownloadPalette={() => navigate('color')}
        />
      )}

      <div className="su-rail" aria-label="Para empezar">
        <article className="su-rail-card">
          <img
            src="./assets/svg-design/day-look.jpg"
            alt="Look editorial de blazer claro y vaqueros"
          />
          <span className="su-rail-tag">Tu look</span>
          <div className="su-rail-foot">
            <div>
              <strong>Paseo en la ciudad</strong>
              <small>Natural · tu paleta</small>
            </div>
            <button type="button" onClick={() => navigate('armario')} aria-label="Ver mi look">
              <ArrowIcon />
            </button>
          </div>
        </article>
        <article className="su-rail-card su-rail-color">
          <div className="su-mosaic" aria-hidden="true">
            {palette.slice(0, 4).map((hex, i) => (
              <i key={hex + i} style={{ background: hex }} />
            ))}
          </div>
          <span className="su-rail-tag su-rail-tag-dark">
            {account.analysis?.colorimetry.season || 'Tu paleta'}
          </span>
          <div className="su-rail-foot su-rail-foot-dark">
            <div>
              <strong>Colores que te iluminan</strong>
              <small>{palette.length} tonos guardados</small>
            </div>
            <button type="button" onClick={() => navigate('color')} aria-label="Ver mi paleta">
              <ArrowIcon />
            </button>
          </div>
        </article>
        <article className="su-rail-card">
          <img
            src="./assets/svg-design/makeup.jpg"
            alt="Retrato editorial con maquillaje natural"
          />
          <span className="su-rail-tag">Makeup</span>
          <div className="su-rail-foot">
            <div>
              <strong>Natural, sin esfuerzo</strong>
              <small>Tu rutina de hoy</small>
            </div>
            <button
              type="button"
              onClick={() => navigate('makeup')}
              aria-label="Ver mi maquillaje"
            >
              <ArrowIcon />
            </button>
          </div>
        </article>
      </div>

      <section className="su-section">
        <div className="su-section-head">
          <h2>¿Por dónde empezamos?</h2>
          <p>Pequeñas decisiones, grandes sensaciones.</p>
        </div>
        <div className="su-tiles">
          <button type="button" className="su-tile" onClick={() => navigate('color')}>
            <span className="su-tile-media">
              <span className="su-mosaic su-mosaic-tile" aria-hidden="true">
                {palette.slice(0, 4).map((hex, idx) => (
                  <i key={hex + idx} style={{ background: hex }} />
                ))}
              </span>
            </span>
            <span className="su-tile-label">
              <PaletteIcon /> Colores
            </span>
          </button>
          <button type="button" className="su-tile" onClick={() => navigate('makeup')}>
            <span className="su-tile-media">
              <img
                src="./assets/editorial/eye-sage.jpg"
                alt="Detalle editorial de maquillaje de ojos en salvia"
              />
            </span>
            <span className="su-tile-label">
              <SparkleIcon /> Makeup
            </span>
          </button>
          <button type="button" className="su-tile" onClick={() => navigate('armario')}>
            <span className="su-tile-media">
              <img src={looks[1].image} alt="Tabla de estilo con el look de fin de semana" />
            </span>
            <span className="su-tile-label">
              <HangerIcon /> Outfits
            </span>
          </button>
        </div>
      </section>

      <section className="su-section">
        <div className="su-section-head">
          <h2>Para ti</h2>
          <p>Elegido a partir de tu análisis.</p>
        </div>
        {feed.length ? (
          <div className="su-rows">
            {feed.map(item => (
              <button
                type="button"
                key={item.id}
                className="su-row"
                onClick={() => navigate(item.view)}
              >
                <Photo src={item.image} alt="" />
                <span className="su-row-copy">
                  <strong>{item.title}</strong>
                  <small>{item.note}</small>
                </span>
                <ChevronIcon className="su-row-arrow" />
              </button>
            ))}
          </div>
        ) : (
          <p className="su-empty">
            No hay nada con «{query}» todavía. Prueba con un color o un look.
          </p>
        )}
      </section>

      <section className="su-promise">
        <img src="./assets/editorial/hero-portrait.jpg" alt="Retrato editorial de piel luminosa" />
        <div>
          <p className="su-kicker">Siempre tuyo</p>
          <h2 className="su-title su-title-sm">Una guía que se parece a ti.</h2>
          <button type="button" className="su-link" onClick={onNotify}>
            Revisar mi análisis <ArrowIcon />
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ color */

export function ColorView({
  account,
  peerAccount,
  onDownload,
  onOpenConsultation,
  titleRef
}: {
  account: AccountSlot;
  peerAccount: AccountSlot;
  onDownload: () => void;
  onOpenConsultation: () => void;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const palette = paletteOf(account);
  const c = account.analysis?.colorimetry;
  const [selectedSwatch, setSelectedSwatch] = useState<string>(() => palette[0] || '#E7CE75');
  const [subTab, setSubTab] = useState<StudioSubTab>('results');
  const [toneFilter, setToneFilter] = useState<'all' | 'warm' | 'cold'>('all');
  const [comparedSeasonId, setComparedSeasonId] = useState<string>('verano-frio');

  useEffect(() => {
    const legacySwatches = document.querySelector<HTMLElement>('main#contenido #swatches');
    const legacySwatchName = document.querySelector<HTMLElement>('main#contenido #swatchName');
    if (legacySwatches) legacySwatches.removeAttribute('id');
    if (legacySwatchName) legacySwatchName.removeAttribute('id');
    return () => {
      if (legacySwatches) legacySwatches.id = 'swatches';
      if (legacySwatchName) legacySwatchName.id = 'swatchName';
    };
  }, []);

  const handleSelectSwatch = (hex: string) => {
    setSelectedSwatch(hex.toUpperCase());
  };

  return (
    <>
      <ViewHead
        titleRef={titleRef}
        kicker="UColors"
        title="Los colores que hablan de ti."
        description="Luz, contraste, todas tus subgamas y el atlas completo de las 12 estaciones."
        action={
          <button
            type="button"
            className="su-button su-button-primary"
            onClick={onDownload}
            aria-label="Descargar paleta"
          >
            Descargar paleta
          </button>
        }
      />

      <StudioSubTabsBar
        activeTab={subTab}
        onSelectTab={setSubTab}
        toneFilter={toneFilter}
        onCycleToneFilter={() =>
          setToneFilter(prev => (prev === 'all' ? 'warm' : prev === 'warm' ? 'cold' : 'all'))
        }
      />

      {subTab === 'results' && (
        <ColorWheelComparator
          primaryAccount={account}
          peerAccount={peerAccount}
          toneFilter={toneFilter}
          comparedSeasonId={comparedSeasonId}
          onSelectComparedSeason={setComparedSeasonId}
        />
      )}

      {subTab === 'similar' && (
        <StudioSimilarCatalogPanel account={account} onOpenScanner={onOpenConsultation} />
      )}

      {subTab === 'collage' && (
        <StudioCollageMyPagePanel
          account={account}
          onOpenConsultation={onOpenConsultation}
          onDownloadPalette={onDownload}
        />
      )}

      <section className="su-card su-palette-card">
        <div className="su-palette-head">
          <div>
            <h2 className="su-title su-title-sm">
              {c?.season || 'Tu paleta'} · Todos tus tonos ({palette.length})
            </h2>
            <p>
              {[c?.temperature, c?.contrast, c?.chroma].filter(Boolean).join(' · ') ||
                'Tu espectro cromático completo'}
            </p>
          </div>
          <div className="su-palette-selected">
            <span>Tono activo:</span>
            <strong id="swatchName" className="su-active-swatch-name">
              {selectedSwatch.toUpperCase()}
            </strong>
          </div>
        </div>
        <div id="swatches" className="su-palette-big su-palette-big-all">
          {palette.map((hex, index) => (
            <button
              type="button"
              key={hex + index}
              className="su-palette-swatch-btn"
              onClick={() => handleSelectSwatch(hex)}
              aria-label={`Seleccionar tono ${hex.toUpperCase()}`}
            >
              <span style={{ background: hex }} />
              <span className="su-palette-hex-label">{hex.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </section>

      <PersonalColorimetryAllRanges
        account={account}
        selectedSwatch={selectedSwatch}
        onSelectSwatch={handleSelectSwatch}
      />

      <CompleteColorimetryAtlasSection
        activeUserSeasonName={c?.season}
        comparedSeasonId={comparedSeasonId}
        onCompareSeasonInWheel={seasonId => {
          setComparedSeasonId(seasonId);
          setSubTab('results');
        }}
        onSelectSwatch={handleSelectSwatch}
      />

      <section className="su-section">
        <div className="su-section-head">
          <h2>Tu dossier de inspiración</h2>
          <p>Looks enteros con tus tonos.</p>
        </div>
        <div className="su-rail">
          {looks.map(look => (
            <article key={look.id} className="su-rail-card su-rail-look">
              <img src={look.image} alt={`Tabla de estilo: ${look.name}`} loading="lazy" />
              <span className="su-rail-tag">{look.occasion}</span>
              <div className="su-rail-foot">
                <div>
                  <strong>{look.name}</strong>
                  <small>{look.note}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ makeup */

export function MakeupView({
  account,
  onTryOn,
  titleRef
}: {
  account: AccountSlot;
  onTryOn: () => void;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const palette = paletteOf(account);
  const m = account.analysis?.makeup;
  const tones = [m?.lipHex, m?.blushHex, palette[2], palette[0]].filter(isHex);
  return (
    <>
      <ViewHead
        titleRef={titleRef}
        kicker="Makeup"
        title="Realza lo que te hace única."
        description="Técnica y tonos que se sienten como una segunda piel."
      />

      <MakeupMedallionsRow account={account} onOpenTryOn={onTryOn} />

      <div className="su-makeup-grid">
        {makeupTiles.map(tile => (
          <figure key={tile.id} className="su-makeup-card">
            <div className="su-makeup-media">
              <img
                src={tile.image}
                alt={`Referencia editorial: ${tile.title}`}
                loading="lazy"
              />
              <span className="su-zoom" aria-hidden="true">
                ⌕
              </span>
            </div>
            <figcaption>
              <strong>{tile.title}</strong>
              <small>{tile.caption}</small>
            </figcaption>
            <div className="su-swatches" aria-label={`Tonos de ${tile.title}`}>
              {tile.colors.map(hex => (
                <i key={hex} style={{ background: hex }} />
              ))}
            </div>
          </figure>
        ))}
      </div>

      {tones.length > 0 && (
        <section className="su-section">
          <div className="su-section-head">
            <h2>Tu paleta, en un gesto</h2>
            <p>Los tonos que el análisis propone para tu rostro.</p>
          </div>
          <div className="su-tones">
            {tones.map((hex, index) => (
              <figure key={hex + index}>
                <span style={{ background: hex }} />
                <figcaption>
                  {['Labios', 'Rubor', 'Sombras', 'Iluminador'][index] || 'Tono'}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="su-section">
        <div className="su-section-head">
          <h2>Tu rutina, en imágenes</h2>
          <p>Desliza: cada paso tiene su referencia.</p>
        </div>
        <div className="su-rail su-steps">
          {routineSteps.map((step, index) => (
            <figure key={step.id} className="su-step">
              <div className="su-step-media">
                <img
                  src={step.image}
                  alt={`Paso ${index + 1}: ${step.title}`}
                  loading="lazy"
                />
                <span className="su-step-index">0{index + 1}</span>
              </div>
              <figcaption>
                <strong>{step.title}</strong>
                <small>{step.caption}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="su-section">
        <ToneSimulator
          identity={account.accountId}
          photo={account.analysis?.photos?.face}
          lip={account.analysis?.makeup?.lipHex}
          palette={account.analysis?.colorimetry.palette}
        />
      </section>

      <section className="su-tryon-cta">
        <img src="./assets/editorial/lip-peach.jpg" alt="Primer plano editorial de labios" />
        <div>
          <p className="su-kicker">Probador en pantalla completa</p>
          <h2 className="su-title su-title-sm">Pruébate tus tonos.</h2>
          <p className="su-muted">Sobre tu propia foto, sin salir de la app.</p>
          <button type="button" className="su-button" onClick={onTryOn}>
            Abrir probador <SparkleIcon />
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ outfits */

export function OutfitsView({
  account,
  titleRef
}: {
  account: AccountSlot;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const palette = paletteOf(account);
  const style = account.analysis?.outfit?.style;
  return (
    <>
      <ViewHead
        titleRef={titleRef}
        kicker="Outfits"
        title="¿Qué versión de ti sale hoy?"
        description={
          style
            ? `${style} · ${account.analysis?.outfit?.silhouette || 'tu silueta'}`
            : 'Looks completos listos para tu día.'
        }
      />

      <ColorimetryOutfitsCarousel account={account} onNavigateOutfits={() => {}} />

      <div className="su-look-grid">
        {looks.map(look => (
          <article key={look.id} className="su-look">
            <img src={look.image} alt={`Look completo: ${look.name}`} loading="lazy" />
            <div className="su-look-copy">
              <span className="su-look-occasion">{look.occasion}</span>
              <strong>{look.name}</strong>
              <PaletteStrip palette={palette} />
            </div>
          </article>
        ))}
      </div>
      <section className="su-section">
        <div className="su-section-head">
          <h2>Tu paleta en el armario</h2>
          <p>Los tonos que repiten en tus mejores looks.</p>
        </div>
        <div className="su-armario-strip">
          {palette.slice(0, 5).map((hex, idx) => (
            <figure key={hex + idx}>
              <span style={{ background: hex }} />
              <figcaption>{hex.toUpperCase()}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ compras */

export function ShoppingView({
  account,
  onScan,
  onConsultPalette,
  titleRef
}: {
  account: AccountSlot;
  onScan: () => void;
  onConsultPalette: () => void;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const palette = paletteOf(account);
  const c = account.analysis?.colorimetry;
  return (
    <>
      <ViewHead
        titleRef={titleRef}
        kicker="AIShoppie"
        title="Compra menos. Elige mejor."
        description="Antes de llevártelo, comprueba si habla tu idioma."
        action={
          <button
            type="button"
            className="su-button su-button-primary"
            onClick={onScan}
            aria-label="Escanear o buscar producto"
          >
            Escanear o buscar producto
          </button>
        }
      />
      <button type="button" className="su-scan" onClick={onScan}>
        <img
          src="./assets/productos/perfilador.jpg"
          alt="Perfiladores y labiales sobre fondo melocotón"
        />
        <span className="su-scan-copy">
          <span className="su-kicker">En la tienda</span>
          <strong>Escanea un producto</strong>
          <small>Mira su afinidad con tu paleta.</small>
        </span>
        <CameraIcon />
      </button>

      <StudioSimilarCatalogPanel account={account} onOpenScanner={onScan} />

      <section className="su-card su-fit">
        <div className="su-fit-head">
          <h2 className="su-title su-title-sm">Lo que ya sabes de ti</h2>
          <PaletteStrip palette={palette} />
        </div>
        <dl>
          <div>
            <dt>Estación</dt>
            <dd>{c?.season || 'Pendiente'}</dd>
          </div>
          <div>
            <dt>Subtono</dt>
            <dd>{c?.temperature || 'Pendiente'}</dd>
          </div>
          <div>
            <dt>Contraste</dt>
            <dd>{c?.contrast || 'Pendiente'}</dd>
          </div>
        </dl>
        <div className="su-fit-actions">
          <button
            type="button"
            className="su-button"
            onClick={onConsultPalette}
            aria-label="Consultar mi paleta"
          >
            Consultar mi paleta
          </button>
        </div>
      </section>
    </>
  );
}
