export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const backendBase = (process.env.BACKEND_URL || 'http://15.207.50.26:3103').replace(/\/+$/, '');

  let subpath = '';
  if (req.query && req.query.path) {
    subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
  }
  if (!subpath) {
    const urlObj = new URL(req.url, 'http://localhost');
    subpath = urlObj.pathname.replace(/^\/api\/?/, '');
  }

  const cleanSubpath = subpath.replace(/^api\//, '');
  const urlObj = new URL(req.url, 'http://localhost');
  const targetUrl = `${backendBase}/api/${cleanSubpath}${urlObj.search}`;

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
      if (['host', 'connection'].includes(key.toLowerCase())) continue;
      headers[key] = value;
    }
    headers['x-forwarded-proto'] = 'https';

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyBuffer,
      redirect: 'manual',
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

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
