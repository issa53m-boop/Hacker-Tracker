const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

let db;

function initDb() {
  if (db) {
    return db;
  }

  const dir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, "hacker-tracker-core.sqlite"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      user_id TEXT PRIMARY KEY,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkins (
      user_id TEXT PRIMARY KEY,
      checked_in_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      creator_user_id TEXT NOT NULL,
      member_low_id TEXT NOT NULL,
      member_high_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function getDb() {
  return initDb();
}

module.exports = { initDb, getDb };
