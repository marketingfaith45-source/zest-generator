const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lnfutteeppptszeivhiu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnV0dGVlcHBwdHN6ZWl2aGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjM2MTQsImV4cCI6MjEwMzczOTYxNH0.LtowAtL3DnbP5JQboN-OLyMCyLgRq-5NsHec5NIOciY';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function supabase(method, path, body) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) { const e = await r.text(); throw new Error(e); }
  return r.status === 204 ? null : r.json();
}

async function getSession(token) {
  try {
    const rows = await supabase('GET', 'zest_sessions?token=eq.' + encodeURIComponent(token) + '&select=user_data,expires_at');
    if (!rows || !rows[0]) return null;
    if (new Date(rows[0].expires_at) < new Date()) return null;
    return rows[0].user_data;
  } catch(e) { return null; }
}

module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2024';

  // LOGIN
  if (action === 'login' && req.method === 'POST') {
    const { username, password } = req.body;
    let user = null;

    if (username === 'admin' && password === ADMIN_PASSWORD) {
      user = { username: 'admin', role: 'admin', name: 'Admin' };
    } else {
      try {
        const rows = await supabase('GET', 'zest_users?username=eq.' + encodeURIComponent(username?.toLowerCase()) + '&select=*');
        if (rows && rows[0] && rows[0].password === password) {
          user = { username: rows[0].username, role: rows[0].role, name: rows[0].name };
        }
      } catch(e) {}
    }

    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const token = Buffer.from(username + ':' + Date.now() + ':' + Math.random()).toString('base64');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      await supabase('POST', 'zest_sessions', { token, user_data: user, expires_at: expires });
    } catch(e) {}

    return res.status(200).json({ success: true, token, user });
  }

  // VERIFY
  if (action === 'verify' && req.method === 'GET') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    const session = await getSession(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
    return res.status(200).json({ user: session });
  }

  // LOGOUT
  if (action === 'logout' && req.method === 'POST') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) {
      try { await supabase('DELETE', 'zest_sessions?token=eq.' + encodeURIComponent(token)); } catch(e) {}
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
};
