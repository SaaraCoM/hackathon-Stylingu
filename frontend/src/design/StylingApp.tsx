import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Snapshot, View } from './types';
import { ColorView, HomeView, MakeupView, OutfitsView, ShoppingView } from './views';
import { ToneSimulator } from './tryon/ToneSimulator';
import {
  BagIcon,
  BellIcon,
  ChevronIcon,
  CloseIcon,
  HangerIcon,
  HomeIcon,
  MenuIcon,
  PaletteIcon,
  SparkleIcon
} from './icons';
import {
  analyticsConfigured,
  readAnalyticsConsent,
  setAnalyticsConsent,
  trackEvent
} from './analytics';
import {
  AccountSwitcher,
  FileVersionBadge,
  MultiAccountProvider,
  StylizedProfileAvatar,
  useMultiAccount
} from './multi-account';
import { StudioDesktopSidebar } from './studio-video-components';
import { REQUIRED_FILE_VERSION } from './file-version';

const views: { id: View; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: <HomeIcon /> },
  { id: 'color', label: 'UColors', short: 'Colores', icon: <PaletteIcon /> },
  { id: 'makeup', label: 'Makeup', short: 'Makeup', icon: <SparkleIcon /> },
  { id: 'armario', label: 'Outfits', short: 'Outfits', icon: <HangerIcon /> },
  { id: 'compras', label: 'AIShoppie', short: 'Compras', icon: <BagIcon /> }
];

type SheetType = 'menu' | 'notify' | 'tryon' | null;

function Sheet({
  label,
  onClose,
  children,
  className = ''
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('su-sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('su-sheet-open');
    };
  }, [onClose]);
  return (
    <div
      className="su-sheet-wrap"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`su-sheet ${className}`}>
        <button
          ref={close}
          type="button"
          className="su-sheet-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}

function downloadPalette(palette: string[]) {
  if (!palette.length) {
    window.stylinguDesign.notify('Completa tu análisis para descargar la paleta.');
    return;
  }
  trackEvent('palette_downloaded', { tones: palette.length });
  const blob = new Blob([palette.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stylingu-paleta.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.stylinguDesign.notify('Paleta descargada.');
}

function AnalyticsNotice() {
  const [consent, setConsent] = useState(() => readAnalyticsConsent());
  const [configured] = useState(() => analyticsConfigured());
  if (!configured) return null;
  const decide = (next: 'granted' | 'denied') => {
    setAnalyticsConsent(next);
    setConsent(next);
  };
  return (
    <div className="su-consent">
      <p>
        Grabación de sesión opcional para mejorar StylingU. Los campos que escribes y tus fotos
        quedan ocultos.
      </p>
      {consent === 'unset' ? (
        <div className="su-consent-actions">
          <button type="button" className="su-button" onClick={() => decide('granted')}>
            Permitir grabación
          </button>
          <button type="button" className="su-button" onClick={() => decide('denied')}>
            No, gracias
          </button>
        </div>
      ) : (
        <p>
          {consent === 'granted' ? 'Grabación activa.' : 'Grabación desactivada.'}{' '}
          <button
            type="button"
            className="su-link"
            onClick={() => decide(consent === 'granted' ? 'denied' : 'granted')}
          >
            {consent === 'granted' ? 'Desactivar' : 'Activar'}
          </button>
        </p>
      )}
    </div>
  );
}

function StylingAppShell({
  view,
  setView,
  canInstall,
  sheet,
  setSheet
}: {
  view: View;
  setView: (next: View) => void;
  canInstall: boolean;
  sheet: SheetType;
  setSheet: (next: SheetType) => void;
}) {
  const bridge = window.stylinguDesign;
  const { activeAccount, comparisonAccount, setThemeForAccount } = useMultiAccount();
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      window.scrollTo?.({ top: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      /* JSDOM compatibility */
    }
    title.current?.focus({ preventScroll: true });
  }, [view]);

  const navigate = (next: View) => {
    setSheet(null);
    setView(next);
    bridge.navigate(next);
  };
  const openAccount = (from: string) => {
    trackEvent('account_opened', { from });
    bridge.account();
  };
  const openConsultation = (from: string) => {
    trackEvent('consultation_opened', { from });
    bridge.consultation();
  };
  const openScanner = (from: string) => {
    trackEvent('scanner_opened', { from });
    bridge.scanner();
  };

  const palette = (activeAccount.analysis?.colorimetry.palette || [])
    .filter(hex => /^#[a-f0-9]{6}$/i.test(hex))
    .slice(0, 6);
  const analyzedAt = activeAccount.analysis?.analyzedAt
    ? new Date(activeAccount.analysis.analyzedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long'
      })
    : null;

  return (
    <div
      className={`su-app su-theme-${activeAccount.theme}`}
      data-theme={activeAccount.theme}
      data-account-id={activeAccount.accountId}
      data-required-file-version={REQUIRED_FILE_VERSION}
    >
      <a href="#su-main" className="su-skip">
        Saltar al contenido
      </a>

      <header className="su-header">
        <div className="su-header-inner">
          <button
            type="button"
            className="su-wordmark"
            onClick={() => navigate('inicio')}
            aria-label="StylingU, inicio"
          >
            StylingU
            <span className="su-wordmark-dot" aria-hidden="true" />
          </button>
          <nav className="su-header-nav" aria-label="Secciones de StylingU">
            {views.map(item => (
              <button
                type="button"
                key={item.id}
                aria-current={view === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="su-header-actions">
            <FileVersionBadge compact className="su-header-ver" />
            <button
              type="button"
              className="su-dashboard-pill"
              onClick={() =>
                setThemeForAccount(
                  activeAccount.accountId,
                  activeAccount.theme === 'studio' ? 'editorial' : 'studio'
                )
              }
              aria-label="Alternar tema de estudio"
            >
              {activeAccount.theme === 'studio' ? 'Studio' : 'Dashboard'}
            </button>
            <button
              type="button"
              className="su-icon-btn"
              onClick={() => setSheet('notify')}
              aria-label="Avisos de tu análisis"
            >
              <BellIcon />
              <span className="su-badge" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="su-icon-btn"
              onClick={() => setSheet('menu')}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="su-studio-shell">
        <StudioDesktopSidebar
          currentView={view}
          onNavigate={navigate}
          onOpenAccount={() => setSheet('menu')}
          onOpenNotifications={() => setSheet('notify')}
        />

        <main id="su-main" className={`su-main su-view-${view}`}>
          {view === 'inicio' && (
            <HomeView
              titleRef={title}
              account={activeAccount}
              peerAccount={comparisonAccount}
              navigate={navigate}
              onNotify={() => setSheet('notify')}
              onOpenConsultation={() => openConsultation('home')}
            />
          )}
          {view === 'color' && (
            <ColorView
              titleRef={title}
              account={activeAccount}
              peerAccount={comparisonAccount}
              onDownload={() => downloadPalette(palette)}
              onOpenConsultation={() => openConsultation('color')}
            />
          )}
          {view === 'makeup' && (
            <MakeupView
              titleRef={title}
              account={activeAccount}
              onTryOn={() => setSheet('tryon')}
            />
          )}
          {view === 'armario' && <OutfitsView titleRef={title} account={activeAccount} />}
          {view === 'compras' && (
            <ShoppingView
              titleRef={title}
              account={activeAccount}
              onScan={() => openScanner('compras')}
              onConsultPalette={() => navigate('color')}
            />
          )}
        </main>
      </div>

      <footer className="su-footer">
        <span>
          StylingU · tu estilo, a tu manera · Especificación de archivo {REQUIRED_FILE_VERSION}
        </span>
        <button type="button" onClick={() => openAccount('footer')}>
          Mi cuenta y privacidad
        </button>
      </footer>

      <nav className="su-bottomnav" aria-label="Secciones de StylingU">
        {views.map(item => (
          <button
            type="button"
            key={item.id}
            aria-label={item.label}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => navigate(item.id)}
          >
            {item.icon}
            <span>{item.short}</span>
          </button>
        ))}
      </nav>

      {sheet === 'menu' && (
        <Sheet label="Menú" onClose={() => setSheet(null)}>
          <div className="su-sheet-top-meta">
            <p className="su-kicker">Tu espacio</p>
            <FileVersionBadge compact />
          </div>
          <h2 className="su-title su-title-sm">Todo lo tuyo, en un sitio.</h2>

          <AccountSwitcher
            onOpenAuthModal={() => {
              setSheet(null);
              openAccount('menu-switcher');
            }}
          />

          <nav className="su-menu" aria-label="Menú de secciones">
            {views.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(item.id)}
                className={view === item.id ? 'is-active' : ''}
              >
                <span className="su-menu-icon">{item.icon}</span>
                <span>{item.label}</span>
                <ChevronIcon />
              </button>
            ))}
          </nav>
          <div className="su-menu-secondary">
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                openConsultation('menu');
              }}
            >
              Actualizar mis fotos y análisis ({REQUIRED_FILE_VERSION})
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                openAccount('menu');
              }}
            >
              Mi perfil y privacidad
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                openScanner('menu');
              }}
            >
              Escanear un producto
            </button>
            {canInstall && (
              <button
                type="button"
                onClick={async () => {
                  await window.stylinguInstall?.prompt();
                  setSheet(null);
                }}
              >
                Instalar la app en mi teléfono
              </button>
            )}
          </div>
          <AnalyticsNotice />
        </Sheet>
      )}

      {sheet === 'notify' && (
        <Sheet label="Avisos" onClose={() => setSheet(null)} className="su-sheet-notify">
          <div className="su-sheet-top-meta">
            <p className="su-kicker">Tu análisis</p>
            <FileVersionBadge />
          </div>
          <h2 className="su-title su-title-sm">
            {activeAccount.analysis ? 'Todo al día.' : 'Aún sin análisis.'}
          </h2>
          <div className="su-notify-card">
            <StylizedProfileAvatar
              accountId={activeAccount.accountId}
              name={activeAccount.profileData.name}
              rawPhoto={activeAccount.analysis?.photos?.face}
              theme={activeAccount.theme}
              accentHex={palette[0]}
            />
            <div>
              <strong>
                {activeAccount.analysis?.colorimetry.season || 'Sube tus fotos para empezar'}
              </strong>
              <small>
                {analyzedAt
                  ? `Actualizado el ${analyzedAt} · Perfil v${activeAccount.profileData.version}`
                  : `Cara y cuerpo, en dos pasos (${REQUIRED_FILE_VERSION}).`}
              </small>
            </div>
          </div>
          <div className="su-notify-swatches" aria-hidden="true">
            {palette.map((hex, idx) => (
              <i key={hex + idx} style={{ background: hex }} />
            ))}
          </div>
          <div className="su-sheet-actions">
            <button
              type="button"
              className="su-button su-button-primary"
              onClick={() => {
                setSheet(null);
                openConsultation('notify');
              }}
            >
              Actualizar mis fotos
            </button>
            <button
              type="button"
              className="su-button"
              onClick={() => {
                setSheet(null);
                openAccount('notify');
              }}
            >
              Mi perfil
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'tryon' && (
        <Sheet label="Probador de tonos" onClose={() => setSheet(null)} className="su-sheet-wide">
          <ToneSimulator
            identity={activeAccount.accountId || ''}
            photo={activeAccount.analysis?.photos?.face}
            lip={activeAccount.analysis?.makeup?.lipHex}
            palette={activeAccount.analysis?.colorimetry.palette}
          />
        </Sheet>
      )}
    </div>
  );
}

export function StylingApp() {
  const bridge = window.stylinguDesign;
  const [snapshot, setSnapshot] = useState<Snapshot>(() => bridge.snapshot());
  const [view, setView] = useState<View>('inicio');
  const [canInstall, setCanInstall] = useState(() => !!window.stylinguInstall?.available());
  const [sheet, setSheet] = useState<SheetType>(null);

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

  return (
    <MultiAccountProvider snapshot={snapshot}>
      <StylingAppShell
        view={view}
        setView={setView}
        canInstall={canInstall}
        sheet={sheet}
        setSheet={setSheet}
      />
    </MultiAccountProvider>
  );
}
