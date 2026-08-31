import { kv } from '@vercel/kv';

// Simple password protection
const PASSWORD = process.env.APP_PASSWORD || 'zest2024';

function checkAuth(req) {
  const auth = req.headers['x-app-password'] || req.query.password;
  return auth === PASSWORD;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-password');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({ error: 'Missing key parameter' });
  }

  // GET - load data
  if (req.method === 'GET') {
    try {
      const data = await kv.get(key);
      return res.status(200).json({ data: data || null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST - save data
  if (req.method === 'POST') {
    try {
      const { value } = req.body;
      await kv.set(key, value);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
