const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
export function securityHeaders(req, res, next) {
  res.set('Content-Security-Policy', CSP).set('X-Frame-Options', 'DENY').set('X-Content-Type-Options', 'nosniff')
    .set('Referrer-Policy', 'no-referrer').set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'private, no-store');
  next();
}
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const expected = process.env.PUBLIC_ORIGIN || req.protocol + '://' + req.get('host');
  const origin = req.get('Origin');
  // A required non-simple header also protects requests with no Origin. No CORS permission is granted.
  if ((origin && origin !== expected) || req.get('Sec-Fetch-Site') === 'cross-site' || req.get('X-Stylingu-Request') !== '1') {
    return res.status(403).json({ code: 'ORIGIN_DENIED', error: 'Origen o petición no permitidos.' });
  }
  next();
}
