function extractApiKeyFromHeaders(req) {
  const bearer = req.headers['authorization'];
  if (typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length);
  }
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }
  return undefined;
}

function checkApiKey(req, res, next) {
  const configuredApiKey = process.env.API_KEY;

  // In non-production environments, allow missing API_KEY for easier local dev
  if (!configuredApiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('API_KEY not set. Skipping API key auth in non-production.');
      return next();
    }
    return res.status(500).json({
      error: 'Server misconfiguration',
      message: 'API key not configured',
    });
  }

  const providedKey = extractApiKeyFromHeaders(req);
  if (!providedKey || providedKey !== configuredApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }

  next();
}

module.exports = { checkApiKey };


