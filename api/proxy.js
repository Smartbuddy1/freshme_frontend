export const config = {
  api: {
    bodyParser: false,
  },
};

const HOP_BY_HOP_REQUEST = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const HOP_BY_HOP_RESPONSE = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'upgrade',
]);

export default async function handler(req, res) {
  let backendBase = (process.env.BACKEND_URL || 'https://aaryainnovtech.com/freshme').replace(/\/+$/, '');
  if (backendBase.includes('15.207.50.26:3103')) {
    backendBase = 'http://15.207.50.26';
  }

  let subpath = '';
  if (req.query && req.query.path) {
    subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
  }
  if (!subpath) {
    const urlObj = new URL(req.url, 'http://localhost');
    subpath = urlObj.pathname.replace(/^\/api\/?/, '');
    if (subpath === 'proxy') subpath = '';
  }

  const cleanSubpath = subpath.replace(/^api\//, '').replace(/^\/+/, '');
  const urlObj = new URL(req.url, 'http://localhost');
  urlObj.searchParams.delete('path');
  const search = urlObj.searchParams.toString() ? `?${urlObj.searchParams.toString()}` : '';
  const targetUrl = cleanSubpath
    ? `${backendBase}/api/${cleanSubpath}${search}`
    : `${backendBase}/api${search}`;

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyBuffer = chunks.length && !['GET', 'HEAD'].includes(req.method)
      ? Buffer.concat(chunks)
      : undefined;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (HOP_BY_HOP_REQUEST.has(key.toLowerCase())) continue;
      headers[key] = value;
    }

    // Set origin/referer to backend's expected client origin to pass CSRF origin check
    const clientOrigin = process.env.CLIENT_ORIGIN || 'https://aaryainnovtech.com';
    headers['origin'] = clientOrigin;
    headers['referer'] = clientOrigin.endsWith('/') ? clientOrigin : `${clientOrigin}/`;
    headers['x-forwarded-proto'] = 'https';

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyBuffer,
      redirect: 'manual',
    });

    res.status(response.status);

    // Forward response headers safely without hop-by-hop conflicts
    response.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_RESPONSE.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Forward Set-Cookie headers accurately
    if (typeof response.headers.getSetCookie === 'function') {
      const cookies = response.headers.getSetCookie();
      if (cookies && cookies.length) {
        res.setHeader('Set-Cookie', cookies);
      }
    }

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    res.send(responseBuffer);
  } catch (error) {
    console.error('Vercel proxy to backend failed:', error);
    res.status(502).json({
      error: 'Backend gateway unreachable',
      details: error.message,
    });
  }
}
