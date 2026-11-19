const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------- Health check (from Day 1) ----------
app.get('/api/health', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  res.json({ status: 'ok', users });
});

// ---------- GET /api/users ----------
// Used later by the "choose your user" dropdown
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// ---------- POST /api/food ----------
// Add a new leftover food listing (Donor only)
app.post('/api/food', (req, res) => {
  const { food_name, quantity, expiry_time, location, posted_by } = req.body;

  // 1. Required fields
  if (!food_name || !quantity || !expiry_time || !location || !posted_by) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // 2. The poster must exist and be a Donor (BR1)
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(posted_by);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role !== 'Donor') {
    return res.status(403).json({ error: 'Only a Donor can add food' });
  }

  // 3. Expiry must be a valid date in the future (BR4)
  const expiryDate = new Date(expiry_time);
  if (isNaN(expiryDate.getTime())) {
    return res.status(400).json({ error: 'Invalid expiry time' });
  }
  if (expiryDate <= new Date()) {
    return res.status(400).json({ error: 'Expiry time must be in the future' });
  }

  // 4. Save (status defaults to 'Available')
  const cleanExpiry = expiry_time.replace('T', ' ');
  const result = db.prepare(`
    INSERT INTO food_listing (food_name, quantity, expiry_time, location, posted_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(food_name.trim(), quantity.trim(), cleanExpiry, location.trim(), posted_by);

  res.status(201).json({
    message: 'Food listing added',
    food_id: result.lastInsertRowid
  });
});

// ---------- GET /api/food ----------
// View listings. Optional filter: /api/food?status=Available
app.get('/api/food', (req, res) => {
  const { status } = req.query;

  let sql = `
    SELECT f.*, u.name AS donor_name, u.phone AS donor_phone
    FROM food_listing f
    JOIN users u ON f.posted_by = u.user_id
  `;
  const params = [];

  if (status) {
    sql += ' WHERE f.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY f.expiry_time ASC';

  let rows = db.prepare(sql).all(params);

  // Expired food should not show up as available
  if (status === 'Available') {
    const now = new Date();
    rows = rows.filter(r => new Date(r.expiry_time) > now);
  }

  res.json(rows);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});