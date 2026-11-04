import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Snapshot, View } from './types';
import { ColorView, HomeView, MakeupView, OutfitsView, ShoppingView } from './views';
import { ToneSimulator } from './tryon/ToneSimulator';
import { BagIcon, BellIcon, ChevronIcon, CloseIcon, HangerIcon, HomeIcon, MenuIcon, PaletteIcon, SparkleIcon } from './icons';
import { analyticsConfigured, readAnalyticsConsent, setAnalyticsConsent, trackEvent } from './analytics';

const views: { id: View; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: <HomeIcon /> },
  { id: 'color', label: 'UColors', short: 'Colores', icon: <PaletteIcon /> },
  { id: 'makeup', label: 'Makeup', short: 'Makeup', icon: <SparkleIcon /> },
  { id: 'armario', label: 'Outfits', short: 'Outfits', icon: <HangerIcon /> },
  { id: 'compras', label: 'AIShoppie', short: 'Compras', icon: <BagIcon /> }
];

type Sheet = 'menu' | 'notify' | 'tryon' | null;

function Sheet({ label, onClose, children, className = '' }: {
  label: string; onClose: () => void; children: React.ReactNode; className?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('su-sheet-open');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('su-sheet-open'); };
  }, [onClose]);
  return <div className="su-sheet-wrap" role="dialog" aria-modal="true" aria-label={label} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`su-sheet ${className}`}>
      <button ref={close} type="button" className="su-sheet-close" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
      {children}
    </div>
  </div>;
}

function downloadPalette(palette: string[]) {
  if (!palette.length) { window.stylinguDesign.notify('Completa tu análisis para descargar la paleta.'); return; }
  trackEvent('palette_downloaded', { tones: palette.length });
  const blob = new Blob([palette.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'stylingu-paleta.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.stylinguDesign.notify('Paleta descargada.');
}

/* Session Replay consent: opt-in only, revocable, and absent when this deployment
 * has no public PostHog project token. It lives in the menu sheet because the
 * footer is hidden on mobile. */
function AnalyticsNotice() {
  const [consent, setConsent] = useState(() => readAnalyticsConsent());
  const [configured] = useState(() => analyticsConfigured());
  if (!configured) return null;
  const decide = (next: 'granted' | 'denied') => { setAnalyticsConsent(next); setConsent(next); };
  return <div className="su-consent">
    <p>Grabación de sesión opcional para mejorar StylingU. Los campos que escribes y tus fotos quedan ocultos.</p>
    {consent === 'unset'
      ? <div className="su-consent-actions">
        <button type="button" className="su-button" onClick={() => decide('granted')}>Permitir grabación</button>
        <button type="button" className="su-button" onClick={() => decide('denied')}>No, gracias</button>
      </div>
      : <p>{consent === 'granted' ? 'Grabación activa.' : 'Grabación desactivada.'} <button type="button" className="su-link" onClick={() => decide(consent === 'granted' ? 'denied' : 'granted')}>{consent === 'granted' ? 'Desactivar' : 'Activar'}</button></p>}
  </div>;
}

export function StylingApp() {
  const bridge = window.stylinguDesign;
  const [snapshot, setSnapshot] = useState<Snapshot>(() => bridge.snapshot());
  const [view, setView] = useState<View>('inicio');
  const [canInstall, setCanInstall] = useState(() => !!window.stylinguInstall?.available());
  const [sheet, setSheet] = useState<Sheet>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => bridge.subscribe(() => setSnapshot(bridge.snapshot())), [bridge]);

  useEffect(() => {
    const sync = () => setCanInstall(!!window.stylinguInstall?.available());
    window.addEventListener('stylingu:install', sync);
    return () => window.removeEventListener('stylingu:install', sync);
  }, []);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const id = (event as CustomEvent<string>).detail.replace('tab-', '');
      if (views.some(item => item.id === id)) setView(id as View);
    };
    const onAccount = () => setView('inicio');
    window.addEventListener('stylingu:navigate', onNavigate);
    window.addEventListener('stylingu:account', onAccount);
    return () => {
      window.removeEventListener('stylingu:navigate', onNavigate);
      window.removeEventListener('stylingu:account', onAccount);
    };
  }, []);

  useLayoutEffect(() => {
    document.getElementById('appShell')?.classList.add('su-mounted');
    return () => document.getElementById('appShell')?.classList.remove('su-mounted');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    title.current?.focus({ preventScroll: true });
  }, [view]);

  const navigate = (next: View) => {
    setSheet(null);
    setView(next);
    bridge.navigate(next);
  };
  const openAccount = (from: string) => { trackEvent('account_opened', { from }); bridge.account(); };
  const openConsultation = (from: string) => { trackEvent('consultation_opened', { from }); bridge.consultation(); };
  const openScanner = (from: string) => { trackEvent('scanner_opened', { from }); bridge.scanner(); };
  const palette = (snapshot.analysis?.colorimetry.palette || []).filter(hex => /^#[a-f0-9]{6}$/i.test(hex)).slice(0, 5);
  const analyzedAt = snapshot.analysis?.analyzedAt ? new Date(snapshot.analysis.analyzedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : null;

  return <div className="su-app">
    <a href="#su-main" className="su-skip">Saltar al contenido</a>

    <header className="su-header">
      <div className="su-header-inner">
        <button className="su-wordmark" onClick={() => navigate('inicio')} aria-label="StylingU, inicio">
          StylingU<span className="su-wordmark-dot" aria-hidden="true" />
        </button>
        <nav className="su-header-nav" aria-label="Secciones">
          {views.map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}
        </nav>
        <div className="su-header-actions">
          <button className="su-icon-btn" onClick={() => setSheet('notify')} aria-label="Avisos de tu análisis">
            <BellIcon /><span className="su-badge" aria-hidden="true" />
          </button>
          <button className="su-icon-btn" onClick={() => setSheet('menu')} aria-label="Abrir menú"><MenuIcon /></button>
        </div>
      </div>
    </header>

    <main id="su-main" className={`su-main su-view-${view}`}>
      {view === 'inicio' && <>
        <h1 ref={title} tabIndex={-1} className="su-sr-only">Inicio</h1>
        <HomeView snapshot={snapshot} navigate={navigate} onNotify={() => setSheet('notify')} />
      </>}
      {view === 'color' && <>
        <h1 ref={title} tabIndex={-1} className="su-sr-only">Colorimetría</h1>
        <ColorView analysis={snapshot.analysis} onDownload={() => downloadPalette(palette)} />
      </>}
      {view === 'makeup' && <>
        <h1 ref={title} tabIndex={-1} className="su-sr-only">Maquillaje</h1>
        <MakeupView analysis={snapshot.analysis} onTryOn={() => setSheet('tryon')} />
      </>}
      {view === 'armario' && <>
        <h1 ref={title} tabIndex={-1} className="su-sr-only">Outfits</h1>
        <OutfitsView analysis={snapshot.analysis} />
      </>}
      {view === 'compras' && <>
        <h1 ref={title} tabIndex={-1} className="su-sr-only">Compras</h1>
        <ShoppingView analysis={snapshot.analysis} onScan={() => openScanner('compras')} />
      </>}
    </main>

    <footer className="su-footer">
      <span>StylingU · tu estilo, a tu manera</span>
      <button onClick={() => openAccount('footer')}>Mi cuenta y privacidad</button>
    </footer>

    <nav className="su-bottomnav" aria-label="Navegación principal">
      {views.map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
        {item.icon}<span>{item.short}</span>
      </button>)}
    </nav>

    {sheet === 'menu' && <Sheet label="Menú" onClose={() => setSheet(null)}>
      <p className="su-kicker">Tu espacio</p>
      <h2 className="su-title su-title-sm">Todo lo tuyo, en un sitio.</h2>
      <nav className="su-menu">
        {views.map(item => <button key={item.id} onClick={() => navigate(item.id)} className={view === item.id ? 'is-active' : ''}>
          <span className="su-menu-icon">{item.icon}</span><span>{item.label}</span><ChevronIcon />
        </button>)}
      </nav>
      <div className="su-menu-secondary">
        <button onClick={() => { setSheet(null); openConsultation('menu'); }}>Actualizar mis fotos y análisis</button>
        <button onClick={() => { setSheet(null); openAccount('menu'); }}>Mi perfil y privacidad</button>
        <button onClick={() => { setSheet(null); openScanner('menu'); }}>Escanear un producto</button>
        {canInstall && <button onClick={async () => { await window.stylinguInstall?.prompt(); setSheet(null); }}>Instalar la app en mi teléfono</button>}
      </div>
      <AnalyticsNotice />
    </Sheet>}

    {sheet === 'notify' && <Sheet label="Avisos" onClose={() => setSheet(null)} className="su-sheet-notify">
      <p className="su-kicker">Tu análisis</p>
      <h2 className="su-title su-title-sm">{snapshot.analysis ? 'Todo al día.' : 'Aún sin análisis.'}</h2>
      <div className="su-notify-card">
        <span className="su-notify-dot" aria-hidden="true" />
        <div><strong>{snapshot.analysis?.colorimetry.season || 'Sube tus fotos para empezar'}</strong>
          <small>{analyzedAt ? `Actualizado el ${analyzedAt}` : 'Cara y cuerpo, en dos pasos.'}</small></div>
      </div>
      <div className="su-notify-swatches" aria-hidden="true">{palette.map(hex => <i key={hex} style={{ background: hex }} />)}</div>
      <div className="su-sheet-actions">
        <button className="su-button su-button-primary" onClick={() => { setSheet(null); openConsultation('notify'); }}>Actualizar mis fotos</button>
        <button className="su-button" onClick={() => { setSheet(null); openAccount('notify'); }}>Mi perfil</button>
      </div>
    </Sheet>}

    {sheet === 'tryon' && <Sheet label="Probador de tonos" onClose={() => setSheet(null)} className="su-sheet-wide">
      <ToneSimulator
        identity={snapshot.accountId || ''}
        photo={snapshot.analysis?.photos?.face}
        lip={snapshot.analysis?.makeup?.lipHex}
        palette={snapshot.analysis?.colorimetry.palette}
      />
    </Sheet>}
  </div>;
}
