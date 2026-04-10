const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { DB_PATH } = require("./config");

function ensureDbDirectory(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDbDirectory(DB_PATH);

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const columns = await all(`PRAGMA table_info(users)`);
  const hasEmailColumn = columns.some((column) => column.name === "email");
  if (!hasEmailColumn) {
    await run(`ALTER TABLE users ADD COLUMN email TEXT`);
  }

  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)`
  );

  await run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 1000,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL UNIQUE,
      host_user_id INTEGER NOT NULL,
      red_user_id INTEGER,
      black_user_id INTEGER,
      status TEXT NOT NULL,
      game_state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (host_user_id) REFERENCES users(id),
      FOREIGN KEY (red_user_id) REFERENCES users(id),
      FOREIGN KEY (black_user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      red_user_id INTEGER,
      black_user_id INTEGER,
      winner_user_id INTEGER,
      winner_side TEXT,
      result TEXT NOT NULL,
      moves_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (red_user_id) REFERENCES users(id),
      FOREIGN KEY (black_user_id) REFERENCES users(id),
      FOREIGN KEY (winner_user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS presence (
      user_id INTEGER PRIMARY KEY,
      online INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL,
      socket_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(
    `CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code)`
  );
  await run(
    `CREATE INDEX IF NOT EXISTS idx_game_records_room_code ON game_records(room_code)`
  );
  await run(
    `CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at DESC)`
  );
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDatabase,
};
