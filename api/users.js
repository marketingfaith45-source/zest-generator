import { kv } from '@vercel/kv';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getSession(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return await kv.get(`session:${token}`); } catch(e) { return null; }
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Please login first' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  // GET all users
  if (req.method === 'GET') {
    try {
      const users = await kv.get('zest-users') || {};
      // Remove passwords before sending
      const safe = Object.fromEntries(
        Object.entries(users).map(([k, v]) => [k, { name: v.name, role: v.role }])
      );
      return res.status(200).json({ users: safe });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST - add/update user
  if (req.method === 'POST') {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const users = await kv.get('zest-users') || {};
      users[username.toLowerCase()] = { password, name, role: role || 'manager' };
      await kv.set('zest-users', users);
      return res.status(200).json({ success: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE user
  if (req.method === 'DELETE') {
    const { username } = req.body;
    try {
      const users = await kv.get('zest-users') || {};
      delete users[username?.toLowerCase()];
      await kv.set('zest-users', users);
      return res.status(200).json({ success: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
