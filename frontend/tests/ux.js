/* tests/ux.js — contrato observable del shell, sin navegador.
 * Stub de DOM minimo + un solo eval concatenado de data.js, js/*.js y
 * app.js (mismo scope compartido que los <script> clasicos del navegador).
 * Cubre: onboarding en 4 pasos, 4 tabs + flechas, armario con empty,
 * consulta con error inline, check-in, storage corrupto y tecla Esc.
 * Uso: `npm test` desde frontend/ (sin dependencias, solo node).
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const PUBLIC = path.join(__dirname, '..', 'public');
const ORDER = ['data.js', 'js/store.js', 'js/ui.js', 'js/color.js',
  'js/wardrobe.js', 'js/makeup.js', 'js/skincare.js', 'js/onboarding.js', 'app.js'];
const ALL = ORDER.map((f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8')).join('\n');
const HTML = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

function makeEl(tag, attrs) {
  attrs = attrs || {};
  const el = {
    tag: tag, attrs: attrs, children: [], dataset: {}, style: {}, hidden: false, disabled: false,
    textContent: '', innerHTML: '', value: '', title: '', _cls: {}, _listeners: {},
    classList: {
      add: function () { for (const c of arguments) el._cls[c] = true; },
      remove: function () { for (const c of arguments) delete el._cls[c]; },
      toggle: function (c, f) {
        if (f === undefined) { if (el._cls[c]) delete el._cls[c]; else el._cls[c] = true; }
        else if (f) el._cls[c] = true; else delete el._cls[c];
      },
      contains: function (c) { return !!el._cls[c]; }
    },
    setAttribute: function (k, v) { el.attrs[k] = String(v); },
    getAttribute: function (k) { return (k in el.attrs) ? el.attrs[k] : null; },
    addEventListener: function (t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); },
    appendChild: function (c) { el.children.push(c); return c; },
    focus: function () { el._focused = true; },
    click: function () { (el._listeners.click || []).forEach((f) => f({ preventDefault: () => {}, target: el })); },
    key: function (t, k) { (el._listeners[t] || []).forEach((f) => f({ key: k, preventDefault: () => {}, target: el })); }
  };
  return el;
}

// Arranque fresco: nuevo stub + nuevo localStorage por llamada,
// como abrir la app por primera vez en otro perfil.
function boot() {
  const byId = {};
  const idRe = /id="([^"]+)"/g;
  let mm;
  while ((mm = idRe.exec(HTML)) !== null) { if (!byId[mm[1]]) byId[mm[1]] = makeEl('div', { id: mm[1] }); }
  const chipDefs = [];
  const tabRe = /data-tab="([^"]+)"/g;
  while ((mm = tabRe.exec(HTML)) !== null) chipDefs.push(['tab', mm[1]]);
  const dataRe = /data-(fabric|look|zone|goal|jewelry|style)="([^"]+)"/g;
  while ((mm = dataRe.exec(HTML)) !== null) chipDefs.push([mm[1], mm[2]]);
  const allBtns = chipDefs.map((kv) => { const b = makeEl('button'); b.dataset[kv[0]] = kv[1]; return b; });
  const obSteps = [1, 2, 3, 4].map((n) => { const d = makeEl('div'); d.dataset.step = String(n); d.hidden = n !== 1; return d; });
  Object.keys(byId).forEach((k) => { byId[k].id = k; });
  const tabs = ['tab-color', 'tab-armario', 'tab-makeup', 'tab-piel'].map((id) => byId[id]);
  const mem = {};
  const docHandlers = {};
  global.localStorage = {
    getItem: (k) => ((k in mem) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  global.navigator = {};
  global.window = {};
  global.location = { hostname: "test" };
  // Sin backend en el contrato headless: el guardado remoto siempre cae
  // al fallback local, igual que en el navegador sin conexión.
  global.fetch = () => Promise.reject(new Error("sin backend en tests"));
  global.document = {
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => { if (!byId[id]) throw new Error('no such id: ' + id); return byId[id]; },
    querySelectorAll: (sel) => {
      if (sel === '.tab') return tabs;
      if (sel === '.bottomnav button') return allBtns.filter((b) => b.dataset.tab !== undefined);
      if (sel === '.ob-step') return obSteps;
      let m = sel.match(/^\[data-([a-z]+)\]$/);
      if (m) return allBtns.filter((b) => b.dataset[m[1]] !== undefined);
      m = sel.match(/^\[data-([a-z]+)="([^"]+)"\]$/);
      if (m) return allBtns.filter((b) => String(b.dataset[m[1]]) === m[2]);
      if (sel === '.swatch-card') return [];
      return [];
    },
    querySelector: (sel) => global.document.querySelectorAll(sel)[0] || null,
    addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
    activeElement: null
  };
  eval(ALL);
  return {
    byId, mem, allBtns,
    nav: (tab) => allBtns.find((b) => b.dataset.tab === tab),
    chip: (kind, val) => allBtns.find((b) => b.dataset[kind] === val),
    key: (k) => (docHandlers.keydown || []).forEach((f) => f({ key: k, preventDefault: () => {} })),
    rerun: (code) => eval(code)
  };
}

let passed = 0;
const queue = [];
function check(name, fn) { queue.push([name, async () => { await fn(); await Promise.resolve(); }]); }

// --- Escenario 1: primera vez completa ---
// El boot crea el DOM pero los <script> corren en el primer check:
// así el orden de ejecución es idéntico al navegador (DOM listo + scripts).
// (boot diferido: mismo orden que los <script> del navegador)
let t;
check('__boot primera vez__', () => { t = boot(); });
check('onboarding visible en paso 1', () => {
  assert.strictEqual(t.byId.onboardSheet.hidden, false);
  assert.strictEqual(t.byId.obTitle.textContent, '¿Cómo te llamamos?');
});
check('continuar sin nombre muestra error', () => {
  t.byId.obNextBtn.click();
  assert.strictEqual(t.byId.obError.hidden, false);
});
check('paso 2: nombre + objetivos', () => {
  t.byId.obName.value = 'Lucía';
  t.byId.obNextBtn.click();
  assert.strictEqual(t.byId.obTitle.textContent, '¿Qué quieres lograr?');
  t.chip('goal', 'saber_colores').click();
  t.chip('goal', 'compras').click();
  t.byId.obNextBtn.click();
  assert.strictEqual(t.byId.obTitle.textContent, 'Sol, joyas y estilo');
});
check('paso 4: gustos + perfil y hero', () => {
  t.chip('jewelry', 'dorado').click();
  t.chip('style', 'Elegante').click();
  t.byId.obNextBtn.click();
  assert.strictEqual(t.byId.obTitle.textContent, 'Tu dossier está listo');
  t.byId.obNextBtn.click();
  assert.strictEqual(t.byId.onboardSheet.hidden, true);
  const profile = JSON.parse(t.mem['stylingu-profile']);
  assert.strictEqual(profile.name, 'Lucía');
  assert.deepStrictEqual(profile.goals, ['saber_colores', 'compras']);
  assert.ok(t.byId.heroTitle.textContent.indexOf('Lucía') === 0);
  console.log('   toast: ' + t.byId.toast.textContent);
});
check('tabs: clic + flecha cambian de tab', () => {
  t.nav('tab-armario').click();
  assert.ok(t.byId['tab-armario'].classList.contains('active'));
  t.nav('tab-armario').key('keydown', 'ArrowRight');
  assert.ok(t.byId['tab-makeup'].classList.contains('active'));
});
check('armario: shuffle, empty y guardar', async () => {
  const before = t.byId.outfitList.innerHTML;
  t.byId.shuffleBtn.click();
  assert.notStrictEqual(t.byId.outfitList.innerHTML, before);
  assert.strictEqual(t.byId.savedEmpty.hidden, false);
  t.byId.saveFirstBtn.click();
  await Promise.resolve();
  await Promise.resolve();
  assert.strictEqual(t.byId.savedEmpty.hidden, true);
  assert.strictEqual(JSON.parse(t.mem['stylingu-outfits']).length, 1);
  console.log('   toast: ' + t.byId.toast.textContent);
});
check('consulta: vacía da error, con nombre crea dossier', () => {
  t.byId.newConsultBtn.click();
  assert.ok(t.byId.consultModal.classList.contains('open'));
  t.byId.consultName.value = '';
  t.byId.confirmConsultBtn.click();
  assert.strictEqual(t.byId.consultError.hidden, false);
  t.byId.consultName.value = 'Elena';
  t.byId.consultName._listeners.input.forEach((f) => f());
  t.byId.confirmConsultBtn.click();
  assert.ok(!t.byId.consultModal.classList.contains('open'));
  console.log('   toast: ' + t.byId.toast.textContent);
});
check('check-in semanal se guarda', () => {
  t.byId.checkinBtn.click();
  assert.strictEqual(JSON.parse(t.mem['stylingu-checkins']).length, 1);
  console.log('   toast: ' + t.byId.toast.textContent);
});
check('storage corrupto cae a vacío', () => {
  t.mem['stylingu-outfits'] = '{roto';
  t.rerun('renderSaved();');
  assert.strictEqual(t.byId.savedCount.textContent, 'Armario local: 0 conjuntos');
});

// --- Escenario 2: arranque fresco + Esc omite sin perfil ---
let t2;
check('__boot arranque fresco__', () => { t2 = boot(); });
check('Esc omite el onboarding sin crear perfil', () => {
  assert.strictEqual(t2.byId.onboardSheet.hidden, false);
  t2.key('Escape');
  assert.strictEqual(t2.byId.onboardSheet.hidden, true);
  assert.strictEqual(t2.mem['stylingu-profile'], undefined);
  console.log('   toast: ' + t2.byId.toast.textContent);
});

(async () => {
  for (const [name, fn] of queue) { await fn(); passed += 1; console.log('ok - ' + name); }
  console.log('\nUX CONTRACT: ' + (passed - 2) + '/10 checks passed');
})();
