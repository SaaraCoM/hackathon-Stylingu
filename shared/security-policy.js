import { PersonalError } from './personal-error.js';

export class HttpSecurityHeadersPolicy {
  constructor() {
    this.defaultHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://*.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://challenges.cloudflare.com https://*.posthog.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests"
    };
  }

  getHeadersRecord() {
    return { ...this.defaultHeaders };
  }

  applyToExpressResponse(res) {
    const keys = Object.keys(this.defaultHeaders);
    for (let i = 0; i < keys.length; i += 1) {
      const headerName = keys[i];
      res.set(headerName, this.defaultHeaders[headerName]);
    }
  }

  applyToFetchHeaders(headers) {
    const keys = Object.keys(this.defaultHeaders);
    for (let i = 0; i < keys.length; i += 1) {
      const headerName = keys[i];
      headers.set(headerName, this.defaultHeaders[headerName]);
    }
  }
}

export class CorsAndOriginPolicy {
  constructor(allowedOrigins = []) {
    this.allowedOrigins = new Set(allowedOrigins);
    this.allowedMethods = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
    this.allowedHeaders = 'Content-Type, X-Turnstile-Token, Idempotency-Key';
    this.forbiddenCredentialHeaders = [
      'x-meta-api-key',
      'meta-api-key',
      'x-model-api-key',
      'model-api-key'
    ];
  }

  resolveAllowedOrigins(primaryOrigin, envAllowedOrigins = '') {
    const allowed = new Set(this.allowedOrigins);
    if (primaryOrigin && typeof primaryOrigin === 'string') {
      allowed.add(primaryOrigin.trim());
    }
    if (envAllowedOrigins && typeof envAllowedOrigins === 'string') {
      const parts = envAllowedOrigins.split(',');
      for (let i = 0; i < parts.length; i += 1) {
        const clean = parts[i].trim();
        if (clean && clean !== '*') {
          allowed.add(clean);
        }
      }
    }
    return allowed;
  }

  isOriginTrusted(originHeader, primaryOrigin, envAllowedOrigins = '') {
    if (!originHeader || typeof originHeader !== 'string') {
      return false;
    }
    if (originHeader === '*') {
      return false;
    }
    const allowed = this.resolveAllowedOrigins(primaryOrigin, envAllowedOrigins);
    return allowed.has(originHeader);
  }

  buildCorsHeaders(originHeader, primaryOrigin, envAllowedOrigins = '') {
    if (!this.isOriginTrusted(originHeader, primaryOrigin, envAllowedOrigins)) {
      return {};
    }
    return {
      'Access-Control-Allow-Origin': originHeader,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': this.allowedMethods,
      'Access-Control-Allow-Headers': this.allowedHeaders,
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin'
    };
  }

  hasForbiddenClientCredentialHeaders(headerGetter) {
    for (let i = 0; i < this.forbiddenCredentialHeaders.length; i += 1) {
      const headerName = this.forbiddenCredentialHeaders[i];
      const value = headerGetter(headerName);
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return true;
      }
    }
    return false;
  }
}

export class InputAndEmailSecurityValidator {
  constructor() {
    this.emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    this.forbiddenCharsPattern = /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
  }

  isValidEmail(rawEmail) {
    if (typeof rawEmail !== 'string') {
      return false;
    }
    const trimmed = rawEmail.trim().toLowerCase();
    if (trimmed.length < 5 || trimmed.length > 160) {
      return false;
    }
    if (this.forbiddenCharsPattern.test(trimmed)) {
      return false;
    }
    if (trimmed.startsWith('.') || trimmed.endsWith('.') || trimmed.includes('..')) {
      return false;
    }
    const atIndex = trimmed.indexOf('@');
    if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) {
      return false;
    }
    const localPart = trimmed.slice(0, atIndex);
    const domainPart = trimmed.slice(atIndex + 1);
    if (localPart.endsWith('.') || domainPart.startsWith('.') || !domainPart.includes('.')) {
      return false;
    }
    return this.emailPattern.test(trimmed);
  }

  sanitizeTextField(value, maxLength, fieldName, isRequired = false) {
    if (value === undefined || value === null || value === '') {
      if (isRequired) {
        throw new PersonalError(`El campo ${fieldName} es requerido.`, 400, 'INVALID_INPUT');
      }
      return '';
    }
    if (typeof value !== 'string') {
      throw new PersonalError(`El campo ${fieldName} debe ser texto.`, 400, 'INVALID_INPUT');
    }
    const trimmed = value.trim();
    if (isRequired && trimmed.length === 0) {
      throw new PersonalError(`El campo ${fieldName} es requerido.`, 400, 'INVALID_INPUT');
    }
    if (this.forbiddenCharsPattern.test(trimmed)) {
      throw new PersonalError(`El campo ${fieldName} contiene caracteres no permitidos.`, 400, 'INVALID_INPUT');
    }
    return trimmed.slice(0, maxLength);
  }

  validateWardrobeOutfitPayload(body) {
    const payload = body && typeof body === 'object' ? body : {};
    if (!payload.top || !payload.bottom || !payload.jacket) {
      throw new PersonalError('top, bottom y jacket son requeridos.', 400, 'INVALID_INPUT');
    }
    return {
      top: this.sanitizeTextField(payload.top, 120, 'top', true),
      topDesc: this.sanitizeTextField(payload.topDesc ?? '', 300, 'topDesc', false),
      bottom: this.sanitizeTextField(payload.bottom, 120, 'bottom', true),
      bottomDesc: this.sanitizeTextField(payload.bottomDesc ?? '', 300, 'bottomDesc', false),
      jacket: this.sanitizeTextField(payload.jacket, 120, 'jacket', true),
      jacketDesc: this.sanitizeTextField(payload.jacketDesc ?? '', 300, 'jacketDesc', false),
      acc: this.sanitizeTextField(payload.acc ?? '', 120, 'acc', false),
      accDesc: this.sanitizeTextField(payload.accDesc ?? '', 300, 'accDesc', false),
      note: this.sanitizeTextField(payload.note ?? '', 500, 'note', false)
    };
  }
}

export const defaultSecurityHeadersPolicy = new HttpSecurityHeadersPolicy();
export const defaultCorsAndOriginPolicy = new CorsAndOriginPolicy([
  'https://hackathon-stylingu.castellanomateossara.workers.dev',
  'https://stylingu-free-preview.castellanomateossara.workers.dev'
]);
export const defaultInputSecurityValidator = new InputAndEmailSecurityValidator();
