const postgres = require("postgres");
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

async function run(text, params = []) {
  let index = 0;
  const statement = text.replace(/\?/g, () => `$${++index}`);
  return getSql().unsafe(statement, params);
}

async function query(text, params = []) {
  await initDb();
  return run(text, params);
}

async function initDb() {
  if (!ready) {
    ready = createSchema();
  }
  return ready;
}

async function createSchema() {
  await getSql().unsafe(`
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
}

module.exports = { initDb, query };
