// Shared CORS headers for API handlers (Express and serverless).
// Production is same-origin by default. Set ALLOWED_ORIGIN for a specific frontend origin.
// Never use Access-Control-Allow-Origin: * together with credentials.

export function applyCors(req, res, methods = 'POST, OPTIONS') {
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers?.origin;

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV !== 'production' && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Account-Id');
  res.setHeader('Vary', 'Origin');
}

export function handlePreflight(req, res, methods) {
  applyCors(req, res, methods);
  return res.status(204).end();
}
