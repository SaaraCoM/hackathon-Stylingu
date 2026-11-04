import posthog from 'posthog-js';

/* Session Replay is opt-in on this device. Nothing is loaded or sent until the
 * person accepts, and the choice survives sessions (but never crosses accounts:
 * it is a device preference, not personal data). */
export type AnalyticsConsent = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'stylingu:analytics-consent';
const DEFAULT_HOST = 'https://eu.i.posthog.com';

let client: typeof posthog | null = null;
let knownAccount: string | undefined;
let wired = false;

function settings() { return window.STYLINGU_POSTHOG || {}; }
function projectKey() {
 const key = (settings().key || '').trim();
 return /^[A-Za-z0-9_-]{16,}$/.test(key) ? key : '';
}
export function analyticsConfigured() { return Boolean(projectKey()); }

export function readAnalyticsConsent(): AnalyticsConsent {
 try {
  const stored = localStorage.getItem(CONSENT_KEY);
  return stored === 'granted' || stored === 'denied' ? stored : 'unset';
 } catch { return 'unset'; }
}

/* Replays are linked to the account id only. No name, email or photo leaves the page. */
function syncIdentity() {
 if (!client) return;
 const accountId = window.stylinguDesign ? window.stylinguDesign.snapshot().accountId || undefined : undefined;
 if (accountId === knownAccount) return;
 knownAccount = accountId;
 if (accountId) { client.identify(accountId); return; }
 client.reset();
 client.opt_in_capturing();
 client.startSessionRecording(true);
}

function loadClient() {
 if (client || !analyticsConfigured()) return;
 posthog.init(projectKey(), {
  api_host: settings().host || DEFAULT_HOST,
  defaults: '2025-11-30',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_surveys: true,
  respect_dnt: true,
  /* Opted out until the person accepts; the SDK then records from that point on. */
  opt_out_capturing_by_default: true,
  disable_session_recording: true,
  enable_recording_console_log: false,
  session_recording: {
   maskAllInputs: true,
   maskTextSelector: '[data-private], .su-personal, .su-account, .su-hi, .su-avatar, #accountState',
   blockSelector: 'img, canvas, video, iframe, input[type=file], [data-private-block]',
   collectFonts: false,
   /* Local settings win over project defaults: no API bodies, headers or canvas pixels. */
   recordHeaders: false,
   recordBody: false,
   captureCanvas: { recordCanvas: false },
  },
 });
 client = posthog;
 syncIdentity();
}

export function setAnalyticsConsent(consent: 'granted' | 'denied') {
 try { localStorage.setItem(CONSENT_KEY, consent); } catch { /* storage blocked: consent still applies to this page */ }
 if (consent === 'granted' && analyticsConfigured()) {
  loadClient();
  client?.opt_in_capturing();
  client?.startSessionRecording(true);
 } else if (client) {
  client.stopSessionRecording();
  client.opt_out_capturing();
 }
 window.dispatchEvent(new CustomEvent('stylingu:analytics-consent', { detail: consent }));
}

export function trackEvent(event: string, properties?: Record<string, string | number | boolean>) {
 if (!client || readAnalyticsConsent() !== 'granted') return;
 client.capture(event, properties);
}

export function initAnalytics() {
 if (typeof window === 'undefined' || typeof document === 'undefined') return;
 /* Read-only state for hosts and browser checks; it exposes no identifiers. */
 window.stylinguAnalytics = { consent: readAnalyticsConsent, configured: analyticsConfigured, recording: () => Boolean(client && client.sessionRecordingStarted()) };
 if (readAnalyticsConsent() === 'granted' && analyticsConfigured()) {
  loadClient();
  client?.opt_in_capturing();
  client?.startSessionRecording(true);
  trackEvent('app_opened', { view: 'inicio' });
 }
 if (wired) return;
 wired = true;
 window.addEventListener('stylingu:navigate', event => {
  const view = String((event as CustomEvent<string>).detail || '').replace('tab-', '');
  if (view) trackEvent('journey_view', { view });
 });
 window.addEventListener('stylingu:analysis', () => {
  const analysis = window.stylinguDesign ? window.stylinguDesign.snapshot().analysis : null;
  trackEvent('analysis_ready', { source: analysis?.source || 'none', has_analysis: Boolean(analysis) });
 });
 window.addEventListener('stylingu:account', () => {
  const signedIn = Boolean(window.stylinguDesign && window.stylinguDesign.snapshot().accountId);
  trackEvent('account_state_changed', { signed_in: signedIn });
  syncIdentity();
 });
}
