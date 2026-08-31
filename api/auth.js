import { kv } from '@vercel/kv';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Default users - change passwords after first login
const DEFAULT_USERS = {
  'admin': { password: process.env.ADMIN_PASSWORD || 'Admin@2024', role: 'admin', name: 'Admin' },
  'joy': { password: process.env.JOY_PASSWORD || 'Joy@2024', role: 'manager', name: 'Joy' },
  'user2': { password: process.env.USER2_PASSWORD || 'User2@2024', role: 'manager', name: 'User 2' },
  'user3': { password: process.env.USER3_PASSWORD || 'User3@2024', role: 'manager', name: 'User 3' },
  'user4': { password: process.env.USER4_PASSWORD || 'User4@2024', role: 'manager', name: 'User 4' },
  'user5': { password: process.env.USER5_PASSWORD || 'User5@2024', role: 'manager', name: 'User 5' },
  'user6': { password: process.env.USER6_PASSWORD || 'User6@2024', role: 'manager', name: 'User 6' },
};

function generateToken(username) {
  return Buffer.from(`${username}:${Date.now()}:${Math.random()}`).toString('base64');
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // LOGIN
  if (action === 'login' && req.method === 'POST') {
    const { username, password } = req.body;
    
    // Check custom users from KV first
    let users = DEFAULT_USERS;
    try {
      const customUsers = await kv.get('zest-users');
      if (customUsers) users = { ...DEFAULT_USERS, ...customUsers };
    } catch(e) {}

    const user = users[username?.toLowerCase()];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(username);
    const sessionData = { username, role: user.role, name: user.name, token };
    
    // Store session (expires in 30 days)
    try {
      await kv.set(`session:${token}`, sessionData, { ex: 60 * 60 * 24 * 30 });
    } catch(e) {}

    return res.status(200).json({ 
      success: true, 
      token, 
      user: { username, role: user.role, name: user.name }
    });
  }

  // VERIFY TOKEN
  if (action === 'verify' && req.method === 'GET') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
      const session = await kv.get(`session:${token}`);
      if (!session) return res.status(401).json({ error: 'Invalid or expired token' });
      return res.status(200).json({ user: session });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // LOGOUT
  if (action === 'logout' && req.method === 'POST') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try { await kv.del(`session:${token}`); } catch(e) {}
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
