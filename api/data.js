import { kv } from '@vercel/kv';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Keys that only admin can write
const ADMIN_ONLY_WRITE = ['zest-templates', 'zest-businesses', 'zest-ordere-settings', 'zest-fb-settings'];

async function getSession(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return await kv.get(`session:${token}`);
  } catch(e) { return null; }
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Please login first' });

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing key' });

  // GET - anyone can read
  if (req.method === 'GET') {
    try {
      const data = await kv.get(key);
      return res.status(200).json({ data: data || null });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST - check permissions
  if (req.method === 'POST') {
    // Only admin can write shared data
    if (ADMIN_ONLY_WRITE.includes(key) && session.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update templates and businesses' });
    }

    try {
      const { value } = req.body;
      await kv.set(key, value);
      return res.status(200).json({ success: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
