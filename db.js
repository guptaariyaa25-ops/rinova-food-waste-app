const Database = require('better-sqlite3');

const db = new Database('food.db');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    role     TEXT NOT NULL CHECK (role IN ('Donor','Receiver','Coordinator')),
    phone    TEXT NOT NULL,
    location TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS food_listing (
    food_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name   TEXT NOT NULL,
    quantity    TEXT NOT NULL,
    expiry_time TEXT NOT NULL,
    location    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Available'
                CHECK (status IN ('Available','Requested','Collected')),
    posted_by   INTEGER NOT NULL,
    FOREIGN KEY (posted_by) REFERENCES users(user_id)
  );

  CREATE TABLE IF NOT EXISTS food_request (
    request_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id        INTEGER NOT NULL,
    requested_by   INTEGER NOT NULL,
    coordinator_id INTEGER,
    request_status TEXT NOT NULL DEFAULT 'Pending'
                   CHECK (request_status IN ('Pending','Approved','Rejected','Completed')),
    FOREIGN KEY (food_id) REFERENCES food_listing(food_id),
    FOREIGN KEY (requested_by) REFERENCES users(user_id),
    FOREIGN KEY (coordinator_id) REFERENCES users(user_id)
  );
`);

// Add sample users only if the table is empty
const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO users (name, role, phone, location) VALUES (?, ?, ?, ?)'
  );
  insert.run('Green Leaf Restaurant', 'Donor', '9876543210', 'Kolkata');
  insert.run('Helping Hands NGO', 'Receiver', '9123456780', 'Kolkata');
  insert.run('Annapurna Coordinators', 'Coordinator', '9012345678', 'Kolkata');
}

module.exports = db;
