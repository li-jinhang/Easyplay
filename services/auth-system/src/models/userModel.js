const { get, run } = require("../db");

async function findByUsername(username) {
  return get(
    `SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?`,
    [username]
  );
}

async function findByEmail(email) {
  return get(
    `SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?`,
    [email]
  );
}

async function findById(id) {
  return get(`SELECT id, username, email, created_at FROM users WHERE id = ?`, [id]);
}

async function createUser({ username, email, passwordHash, createdAt }) {
  const result = await run(
    `INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    [username, email, passwordHash, createdAt]
  );
  return {
    id: result.lastID,
    username,
    email,
    created_at: createdAt,
  };
}

module.exports = {
  findByUsername,
  findByEmail,
  findById,
  createUser,
};
