/* Explicit boundary: the existing services retain ownership of account data. */
window.stylinguDesign = {
 snapshot: () => ({
  analysis: store.getAnalysis(),
  name: currentUser?.name || '',
  accountId: currentUser?.id || '',
  profile: typeof store.getPersonalProfile === 'function' ? store.getPersonalProfile() : null,
  plans: typeof store.getPlans === 'function' ? store.getPlans() : [],
  catalog: typeof store.getCatalog === 'function' ? store.getCatalog() : [],
  tutorials: typeof store.getTutorials === 'function' ? store.getTutorials() : [],
  fileVersion: window.STYLINGU_FILE_SPEC?.version || 'v2.0'
 }),
 subscribe: callback => {
  const events = ['stylingu:analysis', 'stylingu:account', 'stylingu:profile', 'stylingu:plans', 'stylingu:tutorials', 'stylingu:catalog'];
  events.forEach(event => window.addEventListener(event, callback));
  return () => events.forEach(event => window.removeEventListener(event, callback));
 },
 navigate: view => { if (view !== 'inicio') switchTab('tab-' + view); },
 account: () => openAccount(),
 consultation: () => showConsultation(),
 scanner: () => openScanner(false),
 notify: message => toast(message)
};
