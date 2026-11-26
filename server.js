const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------- Shared validation for food fields ----------
// Returns an error message, or null when everything is fine
function checkFoodFields(food_name, quantity, expiry_time, location) {
  if ([food_name, quantity, expiry_time, location].some(v => typeof v !== 'string')) {
    return 'Food name, quantity, expiry time and location must be text';
  }
  const name = food_name.trim();
  const qty = quantity.trim();
  const loc = location.trim();

  if (name.length < 2 || name.length > 60) return 'Food name must be 2 to 60 characters';
  if (qty.length < 1 || qty.length > 30) return 'Quantity must be 1 to 30 characters';
  if (!/\d/.test(qty)) return 'Quantity must include a number (for example 10 kg)';
  if (loc.length < 2 || loc.length > 60) return 'Location must be 2 to 60 characters';

  const expiryDate = new Date(expiry_time);
  if (isNaN(expiryDate.getTime())) return 'Invalid expiry time';
  if (expiryDate <= new Date()) return 'Expiry time must be in the future';

  return null;
}

// ---------- Health check ----------
app.get('/api/health', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  res.json({ status: 'ok', users });
});

// ---------- GET /api/users ----------
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// ---------- POST /api/food ----------
// Add a new leftover food listing (Donor only)
app.post('/api/food', (req, res) => {
  const { food_name, quantity, expiry_time, location, posted_by } = req.body || {};

  if (!food_name || !quantity || !expiry_time || !location || !posted_by) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(posted_by);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role !== 'Donor') {
    return res.status(403).json({ error: 'Only a Donor can add food' });
  }

  const problem = checkFoodFields(food_name, quantity, expiry_time, location);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  const result = db.prepare(`
    INSERT INTO food_listing (food_name, quantity, expiry_time, location, posted_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(food_name.trim(), quantity.trim(), expiry_time.replace('T', ' '), location.trim(), posted_by);

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

// ---------- GET /api/food/:id ----------
// Fetch one listing (used to pre-fill the edit form)
app.get('/api/food/:id', (req, res) => {
  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  res.json(food);
});

// ---------- PUT /api/food/:id ----------
// A Donor edits their own listing (only while Available)
app.put('/api/food/:id', (req, res) => {
  const { user_id, food_name, quantity, expiry_time, location } = req.body || {};

  if (!user_id || !food_name || !quantity || !expiry_time || !location) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'Donor') {
    return res.status(403).json({ error: 'Only a Donor can edit food' });
  }

  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  if (food.posted_by !== user.user_id) {
    return res.status(403).json({ error: 'You can only edit your own listings' });
  }
  if (food.status !== 'Available') {
    return res.status(400).json({ error: 'Only available food can be edited' });
  }

  const problem = checkFoodFields(food_name, quantity, expiry_time, location);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  db.prepare(`
    UPDATE food_listing
    SET food_name = ?, quantity = ?, expiry_time = ?, location = ?
    WHERE food_id = ?
  `).run(food_name.trim(), quantity.trim(), expiry_time.replace('T', ' '), location.trim(), food.food_id);

  res.json({ message: 'Food listing updated' });
});

// ---------- DELETE /api/food/:id ----------
// A Donor deletes their own listing (only while Available)
app.delete('/api/food/:id', (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'Donor') {
    return res.status(403).json({ error: 'Only a Donor can delete food' });
  }

  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  if (food.posted_by !== user.user_id) {
    return res.status(403).json({ error: 'You can only delete your own listings' });
  }
  if (food.status !== 'Available') {
    return res.status(400).json({ error: 'Only available food can be deleted' });
  }

  // Old rejected requests still point to this food, so remove them first
  const remove = db.transaction(() => {
    db.prepare('DELETE FROM food_request WHERE food_id = ?').run(food.food_id);
    db.prepare('DELETE FROM food_listing WHERE food_id = ?').run(food.food_id);
  });
  remove();

  res.json({ message: 'Food listing deleted' });
});

// ---------- POST /api/requests ----------
// A Receiver requests an available food item
app.post('/api/requests', (req, res) => {
  const { food_id, requested_by } = req.body || {};

  if (!food_id || !requested_by) {
    return res.status(400).json({ error: 'food_id and requested_by are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(requested_by);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'Receiver') {
    return res.status(403).json({ error: 'Only a Receiver can request food' });
  }

  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(food_id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  if (food.status !== 'Available') {
    return res.status(400).json({ error: 'Food is not available' });
  }
  if (new Date(food.expiry_time) <= new Date()) {
    return res.status(400).json({ error: 'Food has expired' });
  }

  // Both changes succeed together, or neither does
  const createRequest = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO food_request (food_id, requested_by) VALUES (?, ?)'
    ).run(food_id, requested_by);
    db.prepare("UPDATE food_listing SET status = 'Requested' WHERE food_id = ?").run(food_id);
    return result.lastInsertRowid;
  });

  const request_id = createRequest();
  res.status(201).json({ message: 'Food requested', request_id });
});

// ---------- GET /api/requests ----------
// View requests. Optional filter: /api/requests?status=Pending
app.get('/api/requests', (req, res) => {
  const { status } = req.query;

  let sql = `
    SELECT r.request_id, r.food_id, r.request_status, r.coordinator_id,
           f.food_name, f.quantity, f.location, f.status AS food_status,
           u.name AS requested_by_name, u.phone AS requested_by_phone
    FROM food_request r
    JOIN food_listing f ON r.food_id = f.food_id
    JOIN users u ON r.requested_by = u.user_id
  `;
  const params = [];

  if (status) {
    sql += ' WHERE r.request_status = ?';
    params.push(status);
  }
  sql += ' ORDER BY r.request_id DESC';

  res.json(db.prepare(sql).all(params));
});

// ---------- PUT /api/requests/:id ----------
// A Coordinator approves or rejects a pending request
app.put('/api/requests/:id', (req, res) => {
  const { coordinator_id, action } = req.body || {};

  if (!coordinator_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'coordinator_id and action (approve/reject) are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(coordinator_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'Coordinator') {
    return res.status(403).json({ error: 'Only a Coordinator can approve or reject' });
  }

  const request = db.prepare('SELECT * FROM food_request WHERE request_id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.request_status !== 'Pending') {
    return res.status(400).json({ error: 'Only pending requests can be changed' });
  }

  // Expired food cannot be approved (BR11)
  if (action === 'approve') {
  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(request.food_id);
  if (new Date(food.expiry_time) <= new Date()) {
    return res.status(400).json({ error: 'This food has expired. Reject the request instead.' });
  }
}

  const apply = db.transaction(() => {
    if (action === 'approve') {
      db.prepare(
        "UPDATE food_request SET request_status = 'Approved', coordinator_id = ? WHERE request_id = ?"
      ).run(coordinator_id, request.request_id);
    } else {
      db.prepare(
        "UPDATE food_request SET request_status = 'Rejected', coordinator_id = ? WHERE request_id = ?"
      ).run(coordinator_id, request.request_id);
      // Rejected: food becomes available for others again
      db.prepare("UPDATE food_listing SET status = 'Available' WHERE food_id = ?").run(request.food_id);
    }
  });
  apply();

 res.json({ message: action === 'approve' ? 'Request approved' : 'Request rejected' });
});

// ---------- PUT /api/food/:id/status ----------
// A Coordinator marks approved food as Collected
app.put('/api/food/:id/status', (req, res) => {
  const { user_id, status } = req.body || {};

  if (!user_id || !status) {
    return res.status(400).json({ error: 'user_id and status are required' });
  }
  if (status !== 'Collected') {
    return res.status(400).json({ error: 'Only "Collected" can be set here' });
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'Coordinator') {
    return res.status(403).json({ error: 'Only a Coordinator can mark food as collected' });
  }

  const food = db.prepare('SELECT * FROM food_listing WHERE food_id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  if (food.status !== 'Requested') {
    return res.status(400).json({ error: 'Only requested food can be collected' });
  }

  const approved = db.prepare(
    "SELECT * FROM food_request WHERE food_id = ? AND request_status = 'Approved'"
  ).get(food.food_id);
  if (!approved) {
    return res.status(400).json({ error: 'Request must be approved first' });
  }

  const finish = db.transaction(() => {
    db.prepare("UPDATE food_listing SET status = 'Collected' WHERE food_id = ?").run(food.food_id);
    db.prepare("UPDATE food_request SET request_status = 'Completed' WHERE request_id = ?").run(approved.request_id);
  });
  finish();

  res.json({ message: 'Food marked as collected' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});