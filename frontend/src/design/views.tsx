import type { Analysis, Snapshot, View } from './types';
import { privatePhoto } from './media';
import { DEFAULT_PALETTE, looks, makeupTiles, products, routineSteps } from './content';
import { ArrowIcon, CameraIcon, ChevronIcon, HangerIcon, PaletteIcon, SearchIcon, SparkleIcon } from './icons';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const isHex = (value?: string): value is string => /^#[a-f0-9]{6}$/i.test(value || '');

function paletteOf(analysis: Analysis | null): string[] {
  const own = (analysis?.colorimetry.palette || []).filter(isHex);
  return (own.length ? own : DEFAULT_PALETTE).slice(0, 5);
}

export function ViewHead({ kicker, title, description, action }: {
  kicker: string; title: string; description?: string; action?: ReactNode;
}) {
  return <header className="su-viewhead">
    <div>
      <p className="su-kicker">{kicker}</p>
      <h1 className="su-title">{title}</h1>
      {description && <p className="su-lede">{description}</p>}
    </div>
    {action}
  </header>;
}

export function PaletteStrip({ palette }: { palette: string[] }) {
  return <span className="su-strip" aria-hidden="true">{palette.slice(0, 5).map(hex => <i key={hex} style={{ background: hex }} />)}</span>;
}

function Photo({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  return <span className={`su-photo ${className}`}>{src ? <img src={src} alt={alt} loading="lazy" /> : <span className="su-photo-empty" aria-hidden="true" />}</span>;
}

/* ------------------------------------------------------------------ inicio */

export function HomeView({ snapshot, navigate, onNotify }: {
  snapshot: Snapshot; navigate: (view: View) => void; onNotify: () => void;
}) {
  const palette = paletteOf(snapshot.analysis);
  const face = privatePhoto(snapshot.analysis?.photos?.face, window.STYLINGU_API_BASE);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const feed = useMemo(() => [
    { id: 'look', title: 'Terracota de oficina', note: 'Tu look de hoy', image: looks[0].image, view: 'armario' as View },
    { id: 'routine', title: 'Tu rutina en 5 imágenes', note: 'Dos minutos, paso a paso', image: routineSteps[2].image, view: 'makeup' as View },
    { id: 'shop', title: 'Cuatro piezas que encajan', note: 'Elegidas con tu paleta', image: products[1].image, view: 'compras' as View }
  ].filter(item => !q || item.title.toLowerCase().includes(q) || item.note.toLowerCase().includes(q)), [q]);

  return <>
    <section className="su-greeting">
      <div className="su-greeting-copy">
        <p className="su-hi">Hola, {snapshot.name || 'tú'}.</p>
        <h1 className="su-title su-title-hero">Hoy empieza contigo.</h1>
      </div>
      <button className="su-avatar" onClick={onNotify} aria-label="Tu cuenta y avisos">
        {face ? <img src={face} alt="Tu foto privada de perfil" /> : <span>{snapshot.name?.slice(0, 1) || 'S'}</span>}
      </button>
    </section>

    <label className="su-search">
      <SearchIcon />
      <span className="su-sr-only">Buscar inspiración</span>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Busca un look, un tono, una idea…" />
      <span className="su-search-filter">Inspirador</span>
    </label>

    <div className="su-rail" aria-label="Para empezar">
      <article className="su-rail-card">
        <img src="./assets/svg-design/day-look.jpg" alt="Look editorial de blazer claro y vaqueros" />
        <span className="su-rail-tag">Tu look</span>
        <div className="su-rail-foot">
          <div><strong>Paseo en la ciudad</strong><small>Natural · tu paleta</small></div>
          <button onClick={() => navigate('armario')} aria-label="Ver mi look"><ArrowIcon /></button>
        </div>
      </article>
      <article className="su-rail-card su-rail-color">
        <div className="su-mosaic" aria-hidden="true">{palette.slice(0, 4).map(hex => <i key={hex} style={{ background: hex }} />)}</div>
        <span className="su-rail-tag su-rail-tag-dark">{snapshot.analysis?.colorimetry.season || 'Tu paleta'}</span>
        <div className="su-rail-foot su-rail-foot-dark">
          <div><strong>Colores que te iluminan</strong><small>{palette.length} tonos guardados</small></div>
          <button onClick={() => navigate('color')} aria-label="Ver mi paleta"><ArrowIcon /></button>
        </div>
      </article>
      <article className="su-rail-card">
        <img src="./assets/svg-design/makeup.jpg" alt="Retrato editorial con maquillaje natural" />
        <span className="su-rail-tag">Makeup</span>
        <div className="su-rail-foot">
          <div><strong>Natural, sin esfuerzo</strong><small>Tu rutina de hoy</small></div>
          <button onClick={() => navigate('makeup')} aria-label="Ver mi maquillaje"><ArrowIcon /></button>
        </div>
      </article>
    </div>

    <section className="su-section">
      <div className="su-section-head"><h2>¿Por dónde empezamos?</h2><p>Pequeñas decisiones, grandes sensaciones.</p></div>
      <div className="su-tiles">
        <button className="su-tile" onClick={() => navigate('color')}>
          <span className="su-tile-media"><span className="su-mosaic su-mosaic-tile" aria-hidden="true">{palette.slice(0, 4).map(hex => <i key={hex} style={{ background: hex }} />)}</span></span>
          <span className="su-tile-label"><PaletteIcon /> Colores</span>
        </button>
        <button className="su-tile" onClick={() => navigate('makeup')}>
          <span className="su-tile-media"><img src="./assets/editorial/eye-sage.jpg" alt="Detalle editorial de maquillaje de ojos en salvia" /></span>
          <span className="su-tile-label"><SparkleIcon /> Makeup</span>
        </button>
        <button className="su-tile" onClick={() => navigate('armario')}>
          <span className="su-tile-media"><img src={looks[1].image} alt="Tabla de estilo con el look de fin de semana" /></span>
          <span className="su-tile-label"><HangerIcon /> Outfits</span>
        </button>
      </div>
    </section>

    <section className="su-section">
      <div className="su-section-head"><h2>Para ti</h2><p>Elegido a partir de tu análisis.</p></div>
      {feed.length ? <div className="su-rows">{feed.map(item => (
        <button key={item.id} className="su-row" onClick={() => navigate(item.view)}>
          <Photo src={item.image} alt="" />
          <span className="su-row-copy"><strong>{item.title}</strong><small>{item.note}</small></span>
          <ChevronIcon className="su-row-arrow" />
        </button>
      ))}</div> : <p className="su-empty">No hay nada con «{query}» todavía. Prueba con un color o un look.</p>}
    </section>

    <section className="su-promise">
      <img src="./assets/editorial/hero-portrait.jpg" alt="Retrato editorial de piel luminosa" />
      <div><p className="su-kicker">Siempre tuyo</p><h2 className="su-title su-title-sm">Una guía que se parece a ti.</h2><button className="su-link" onClick={onNotify}>Revisar mi análisis <ArrowIcon /></button></div>
    </section>
  </>;
}

/* ------------------------------------------------------------------ color */

export function ColorView({ analysis, onDownload }: { analysis: Analysis | null; onDownload: () => void }) {
  const palette = paletteOf(analysis);
  const c = analysis?.colorimetry;
  const avoid = (analysis?.colorimetry.avoid || []).slice(0, 3);
  return <>
    <ViewHead kicker="UColors" title="Los colores que hablan de ti." description="Luz, contraste y armonía leídos en tu rostro." />
    <section className="su-card su-palette-card">
      <div className="su-palette-head">
        <div><h2 className="su-title su-title-sm">{c?.season || 'Tu paleta'}</h2><p>{[c?.temperature, c?.contrast].filter(Boolean).join(' · ') || 'Tu análisis personal'}</p></div>
        <button className="su-mini" onClick={onDownload}>Descargar</button>
      </div>
      <div className="su-palette-big">{palette.slice(0, 4).map(hex => (
        <figure key={hex}><span style={{ background: hex }} /><figcaption>{hex.toUpperCase()}</figcaption></figure>
      ))}</div>
    </section>

    <section className="su-section">
      <div className="su-section-head"><h2>Tu dossier de inspiración</h2><p>Looks enteros con tus tonos.</p></div>
      <div className="su-rail">
        {looks.slice(0, 3).map(look => (
          <article key={look.id} className="su-rail-card su-rail-look">
            <img src={look.image} alt={`Tabla de estilo: ${look.name}`} loading="lazy" />
            <span className="su-rail-tag">{look.occasion}</span>
            <div className="su-rail-foot"><div><strong>{look.name}</strong><small>{look.note}</small></div></div>
          </article>
        ))}
      </div>
    </section>

    {avoid.length > 0 && <section className="su-section">
      <div className="su-section-head"><h2>Tonos a distanciar</h2><p>Con una alternativa cercana.</p></div>
      <div className="su-avoid">{avoid.map(item => (
        <figure key={item.hex}><span style={{ background: item.hex }} /><figcaption><strong>{item.name}</strong><small>{item.alt}</small></figcaption></figure>
      ))}</div>
    </section>}
  </>;
}

/* ------------------------------------------------------------------ makeup */

export function MakeupView({ analysis, onTryOn }: { analysis: Analysis | null; onTryOn: () => void }) {
  const palette = paletteOf(analysis);
  const m = analysis?.makeup;
  const tones = [m?.lipHex, m?.blushHex, palette[2], palette[0]].filter(isHex);
  return <>
    <ViewHead kicker="Makeup" title="Realza lo que te hace única." description="Técnica y tonos que se sienten como una segunda piel." />
    <div className="su-makeup-grid">{makeupTiles.map(tile => (
      <figure key={tile.id} className="su-makeup-card">
        <div className="su-makeup-media"><img src={tile.image} alt={`Referencia editorial: ${tile.title}`} loading="lazy" /><span className="su-zoom" aria-hidden="true">⌕</span></div>
        <figcaption><strong>{tile.title}</strong><small>{tile.caption}</small></figcaption>
        <div className="su-swatches" aria-label={`Tonos de ${tile.title}`}>{tile.colors.map(hex => <i key={hex} style={{ background: hex }} />)}</div>
      </figure>
    ))}</div>

    {tones.length > 0 && <section className="su-section">
      <div className="su-section-head"><h2>Tu paleta, en un gesto</h2><p>Los tonos que el análisis propone para tu rostro.</p></div>
      <div className="su-tones">{tones.map((hex, index) => (
        <figure key={hex + index}><span style={{ background: hex }} /><figcaption>{['Labios', 'Rubor', 'Sombras', 'Iluminador'][index] || 'Tono'}</figcaption></figure>
      ))}</div>
    </section>}

    <section className="su-section">
      <div className="su-section-head"><h2>Tu rutina, en imágenes</h2><p>Desliza: cada paso tiene su referencia.</p></div>
      <div className="su-rail su-steps">{routineSteps.map((step, index) => (
        <figure key={step.id} className="su-step">
          <div className="su-step-media"><img src={step.image} alt={`Paso ${index + 1}: ${step.title}`} loading="lazy" /><span className="su-step-index">0{index + 1}</span></div>
          <figcaption><strong>{step.title}</strong><small>{step.caption}</small></figcaption>
        </figure>
      ))}</div>
    </section>

    <section className="su-tryon-cta">
      <img src="./assets/editorial/lip-peach.jpg" alt="Primer plano editorial de labios" />
      <div><p className="su-kicker">Probador</p><h2 className="su-title su-title-sm">Pruébate tus tonos.</h2><p className="su-muted">Sobre tu propia foto, sin salir de la app.</p><button className="su-button" onClick={onTryOn}>Abrir probador <SparkleIcon /></button></div>
    </section>
  </>;
}

/* ------------------------------------------------------------------ outfits */

export function OutfitsView({ analysis }: { analysis: Analysis | null }) {
  const palette = paletteOf(analysis);
  const style = analysis?.outfit?.style;
  return <>
    <ViewHead kicker="Outfits" title="¿Qué versión de ti sale hoy?" description={style ? `${style} · ${analysis?.outfit?.silhouette || 'tu silueta'}` : 'Looks completos listos para tu día.'} />
    <div className="su-look-grid">{looks.map(look => (
      <article key={look.id} className="su-look">
        <img src={look.image} alt={`Look completo: ${look.name}`} loading="lazy" />
        <div className="su-look-copy">
          <span className="su-look-occasion">{look.occasion}</span>
          <strong>{look.name}</strong>
          <PaletteStrip palette={palette} />
        </div>
      </article>
    ))}</div>
    <section className="su-section">
      <div className="su-section-head"><h2>Tu paleta en el armario</h2><p>Los tonos que repiten en tus mejores looks.</p></div>
      <div className="su-armario-strip">{palette.map(hex => <figure key={hex}><span style={{ background: hex }} /><figcaption>{hex.toUpperCase()}</figcaption></figure>)}</div>
    </section>
  </>;
}

/* ------------------------------------------------------------------ compras */

export function ShoppingView({ analysis, onScan }: { analysis: Analysis | null; onScan: () => void }) {
  const palette = paletteOf(analysis);
  const c = analysis?.colorimetry;
  return <>
    <ViewHead kicker="AIShoppie" title="Compra menos. Elige mejor." description="Antes de llevártelo, comprueba si habla tu idioma." />
    <button className="su-scan" onClick={onScan}>
      <img src="./assets/productos/perfilador.jpg" alt="Perfiladores y labiales sobre fondo melocotón" />
      <span className="su-scan-copy"><span className="su-kicker">En la tienda</span><strong>Escanea un producto</strong><small>Mira su afinidad con tu paleta.</small></span>
      <CameraIcon />
    </button>
    <section className="su-section">
      <div className="su-section-head"><h2>Elegidas para ti</h2><p>Piezas que acompañan tus tonos.</p></div>
      <div className="su-products">{products.map(product => (
        <article key={product.id} className="su-product">
          <img src={product.image} alt={product.name} loading="lazy" />
          <div><strong>{product.name}</strong><small>{product.note}</small></div>
          <span className="su-match"><i style={{ background: product.swatch }} />{c?.season || 'Tu paleta'}</span>
        </article>
      ))}</div>
    </section>
    <section className="su-card su-fit">
      <div className="su-fit-head"><h2 className="su-title su-title-sm">Lo que ya sabes de ti</h2><PaletteStrip palette={palette} /></div>
      <dl>
        <div><dt>Estación</dt><dd>{c?.season || 'Pendiente'}</dd></div>
        <div><dt>Subtono</dt><dd>{c?.temperature || 'Pendiente'}</dd></div>
        <div><dt>Contraste</dt><dd>{c?.contrast || 'Pendiente'}</dd></div>
      </dl>
    </section>
  </>;
}
