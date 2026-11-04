/* Explicit boundary: the existing services retain ownership of account data. */
window.stylinguDesign = {
 snapshot: () => ({analysis: store.getAnalysis(), name: currentUser?.name || '', accountId: currentUser?.id || ''}),
 subscribe: callback => {
  const events = ['stylingu:analysis', 'stylingu:account', 'stylingu:profile'];
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
 },
 navigate: view => { if (view !== 'inicio') switchTab('tab-' + view); },
 account: () => openAccount(),
 consultation: () => showConsultation(),
 scanner: () => openScanner(false),
 notify: message => toast(message)
};
