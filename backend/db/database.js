const postgres = require("postgres");
const samples = require("../config/sample-candidates");
const { HttpError } = require("../lib/helpers");

let sql;
let ready;

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function getSql() {
  if (sql) {
    return sql;
  }
  const url = connectionString();
  if (!url) {
    throw new HttpError(500, "DATABASE_URL is not set.");
  }
  const local = /localhost|127\.0\.0\.1/.test(url);
  sql = postgres(url, { max: 1, ssl: local ? false : "require" });
  return sql;
}

async function query(text, params = []) {
  await initDb();
  return run(text, params);
}

async function run(text, params = []) {
  let index = 0;
  const statement = text.replace(/\?/g, () => `$${++index}`);
  return getSql().unsafe(statement, params);
}

async function initDb() {
  if (!ready) {
    ready = createSchema();
  }
  return ready;
}

async function createSchema() {
  const db = getSql();
  await db.unsafe(`
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
  await seedSamples();
}

async function seedSamples() {
  for (const sample of samples) {
    const tracksText = Array.isArray(sample.tracks) ? sample.tracks.join(", ") : sample.tracks;
    await run(`
      INSERT INTO users
        (id, display_name, avatar_id, project_idea, tracks_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `, [
      sample.id,
      sample.displayName,
      sample.avatarId,
      sample.projectIdea,
      tracksText,
      "2026-01-01T00:00:00.000Z"
    ]);
    for (const roleId of sample.roles) {
      await run(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (?, ?)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [sample.id, roleId]);
    }
  }
}

module.exports = { initDb, query };
