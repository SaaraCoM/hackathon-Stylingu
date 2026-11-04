/* PWA: registro del shell, instalación en el teléfono y aviso de conexión. */
(() => {
  const notifyInstall = () => window.dispatchEvent(new CustomEvent('stylingu:install'));
  let deferred = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    notifyInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notifyInstall();
  });

  window.stylinguInstall = {
    available: () => !!deferred,
    async prompt() {
      if (!deferred) return false;
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      notifyInstall();
      return choice?.outcome === 'accepted';
    }
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  const setOnlineState = online => {
    document.documentElement.dataset.online = String(online);
    const status = document.getElementById('productStatus');
    if (status) status.textContent = online ? '' : 'Sin conexión. Los datos personales y los cambios necesitan conexión con tu cuenta.';
  };
  window.addEventListener('online', () => setOnlineState(true));
  window.addEventListener('offline', () => setOnlineState(false));
  if (navigator.onLine === false) setOnlineState(false);
})();
