const t=require("fs"),d=require("path"),o=require("sqlite3"),{DB_PATH:_}=require("./config");function R(T){const e=d.dirname(T);t.existsSync(e)||t.mkdirSync(e,{recursive:!0})}R(_);const a=new o.Database(_);function E(T,e=[]){return new Promise((s,i)=>{a.run(T,e,function(r){if(r){i(r);return}s({lastID:this.lastID,changes:this.changes})})})}function u(T,e=[]){return new Promise((s,i)=>{a.get(T,e,(N,r)=>{if(N){i(N);return}s(r||null)})})}function n(T,e=[]){return new Promise((s,i)=>{a.all(T,e,(N,r)=>{if(N){i(N);return}s(r||[])})})}async function L(){await E(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `),(await n("PRAGMA table_info(users)")).some(s=>s.name==="email")||await E("ALTER TABLE users ADD COLUMN email TEXT"),await E("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)"),await E(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 1000,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `),await E(`
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
  `),await E(`
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
  `),await E(`
    CREATE TABLE IF NOT EXISTS presence (
      user_id INTEGER PRIMARY KEY,
      online INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL,
      socket_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `),await E("CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code)"),await E("CREATE INDEX IF NOT EXISTS idx_game_records_room_code ON game_records(room_code)"),await E("CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON game_records(created_at DESC)")}module.exports={db:a,run:E,get:u,all:n,initializeDatabase:L};
