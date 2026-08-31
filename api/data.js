const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lnfutteeppptszeivhiu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnV0dGVlcHBwdHN6ZWl2aGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjM2MTQsImV4cCI6MjEwMzczOTYxNH0.LtowAtL3DnbP5JQboN-OLyMCyLgRq-5NsHec5NIOciY';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ADMIN_ONLY = ['zest-templates','zest-businesses','zest-ordere-settings','zest-fb-settings'];

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

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing key' });

  if (req.method === 'GET') {
    try {
      const rows = await supabase('GET', 'zest_data?key=eq.' + encodeURIComponent(key) + '&select=value');
      return res.status(200).json({ data: rows && rows[0] ? rows[0].value : null });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    if (ADMIN_ONLY.includes(key) && session.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update this' });
    }
    try {
      const { value } = req.body;
      await supabase('POST', 'zest_data', { key, value, updated_at: new Date().toISOString() });
      return res.status(200).json({ success: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
