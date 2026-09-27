const http = require('node:http');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const sessions = new Map();
const email = 'test@example.invalid';
const lifetime = 24 * 60 * 60 * 1000;
let vite;

function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(value));
}

async function body(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 16384) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(text); }
  catch { throw Object.assign(new Error('Please send valid JSON.'), { status: 400 }); }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3000');
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('session='))?.slice(8);
    let session = sessions.get(token);
    if (session && session.expires <= Date.now()) { sessions.delete(token); session = null; }
    if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
      return json(res, 403, { error: 'Origin not allowed.' });
    }
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const data = await body(req);
      if (typeof data?.email !== 'string' || typeof data?.password !== 'string' ||
          data.email.trim().toLowerCase() !== email || data.password.trim() !== 'demo-password') {
        return json(res, 401, { error: 'Email or password is incorrect. Please try again.' });
      }
      if (token) sessions.delete(token);
      const id = randomBytes(32).toString('hex');
      sessions.set(id, { note: '', expires: Date.now() + lifetime });
      return json(res, 200, { email, note: '' }, {
        'Set-Cookie': `session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
      });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sessions.delete(token);
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (url.pathname.startsWith('/api/')) {
      if (!session) return json(res, 401, { error: 'Please log in to continue.' });
      if (req.method === 'GET' && url.pathname === '/api/session') {
        return json(res, 200, { email, note: session.note });
      }
      if (req.method === 'POST' && url.pathname === '/api/note') {
        const data = await body(req);
        if (typeof data?.note !== 'string' || data.note.length > 2000) return json(res, 400, { error: 'Use a note of up to 2,000 characters.' });
        session.note = data.note;
        return json(res, 200, { note: session.note });
      }
      return json(res, 404, { error: 'Not found.' });
    }
    vite.middlewares(req, res, () => json(res, 404, { error: 'Not found.' }));
  } catch (error) {
    json(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please try again.' });
  }
});

setInterval(() => {
  for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
}, 60000).unref();
async function start() {
  const { createServer } = await import('vite');
  vite = await createServer({
    configFile: false,
    root: path.join(__dirname, 'client'),
    publicDir: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: { allow: [path.join(__dirname, 'client')] }
    },
    appType: 'spa'
  });
  server.listen(3000, '127.0.0.1', () => {
    console.log(`Vite workspace listening at http://127.0.0.1:3000 (PID ${process.pid})`);
  });
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });
