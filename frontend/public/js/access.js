/* El shell nace oculto y solo se abre con sesión y análisis recuperado. */
let accessChecking = true;
let accessError = '';
function renderAccess() {
  const logged = typeof currentUser !== 'undefined' && !!currentUser;
  const ready = !accessChecking && logged && !!store.getAnalysis();
  document.getElementById('appShell').hidden = !ready;
  document.getElementById('analysisGate').hidden = ready;
  const button = document.getElementById('gateContinueBtn');
  button.disabled = accessChecking;
  button.textContent = accessChecking ? 'Comprobando…' : accessError ? 'Reintentar' : logged ? 'Subir mis fotos' : 'Entrar o crear cuenta';
  document.getElementById('gateStatus').textContent = accessChecking ? 'Comprobando tu cuenta…'
    : accessError || (logged ? 'Necesitamos completar el análisis de tus fotos para continuar.' : 'Entra o crea tu cuenta para empezar.');
  document.getElementById('gateAccountBtn').hidden = !logged || accessChecking;
  document.getElementById('accountPrefs').hidden = !logged;
}
document.getElementById('gateContinueBtn').addEventListener('click', () => {
  if (accessError) { restoreAccount(); return; }
  if (currentUser) showConsultation();
  else { consultationPending = true; openAccount(); }
});
document.getElementById('gateAccountBtn').addEventListener('click', () => openAccount());
