const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const samples = require("../config/sample-candidates");

let db;

function initDb() {
  if (db) {
    return db;
  }

  const dir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, "spider-tracer.sqlite"));
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      avatar_id TEXT NOT NULL,
      project_idea TEXT NOT NULL,
      tracks_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS swipes (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
      created_at TEXT NOT NULL,
      UNIQUE (from_user_id, to_user_id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_low_id TEXT NOT NULL,
      user_high_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_low_id, user_high_id),
      FOREIGN KEY (user_low_id) REFERENCES users(id),
      FOREIGN KEY (user_high_id) REFERENCES users(id)
    );
  `);
  seedSamples();
  return db;
}

function seedSamples() {
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
      (id, display_name, avatar_id, project_idea, tracks_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
  `);

  for (const sample of samples) {
    const tracksText = Array.isArray(sample.tracks) ? sample.tracks.join(", ") : sample.tracks;
    insertUser.run(
      sample.id,
      sample.displayName,
      sample.avatarId,
      sample.projectIdea,
      tracksText,
      "2026-01-01T00:00:00.000Z"
    );
    for (const roleId of sample.roles) {
      insertRole.run(sample.id, roleId);
    }
  }
}

function getDb() {
  return initDb();
}

module.exports = { initDb, getDb };
