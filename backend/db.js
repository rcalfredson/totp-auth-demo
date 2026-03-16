import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

export async function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      totp_secret TEXT NOT NULL,
      twofa_enabled INTEGER NOT NULL DEFAULT 0
    )
  `);
}

export default db;
