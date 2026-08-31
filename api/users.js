const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lnfutteeppptszeivhiu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnV0dGVlcHBwdHN6ZWl2aGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjM2MTQsImV4cCI6MjEwMzczOTYxNH0.LtowAtL3DnbP5JQboN-OLyMCyLgRq-5NsHec5NIOciY';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

async function getSession(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
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

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Please login first' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    try {
      const rows = await supabase('GET', 'zest_users?select=username,name,role');
      const users = {};
      (rows || []).forEach(u => { users[u.username] = { name: u.name, role: u.role }; });
      return res.status(200).json({ users });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    try {
      await supabase('POST', 'zest_users', {
        username: username.toLowerCase(), password, name, role: role || 'manager'
      });
      return res.status(200).json({ success: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'DELETE') {
    const { username } = req.body;
    try {
      await supabase('DELETE', 'zest_users?username=eq.' + encodeURIComponent(username?.toLowerCase()));
      return res.status(200).json({ success: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
