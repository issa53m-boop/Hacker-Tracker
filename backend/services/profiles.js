const config = require("../config/profile.config");
const samples = require("../config/sample-candidates");
const { getDb } = require("../db/database");
const { HttpError, newId, now } = require("../lib/helpers");

function roleById(roleId) {
  return config.roles.find((role) => role.id === roleId) || null;
}

function parseTracks(value) {
  const parts = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  const tracks = [];

  for (const part of parts) {
    const label = String(part).trim().replace(/\s+/g, " ");
    const key = label.toLowerCase();
    if (!label || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tracks.push(label);
  }

  return tracks;
}

function readProfileInput(body) {
  const source = body || {};
  const displayName = String(source.displayName || "").trim().replace(/\s+/g, " ");
  if (!displayName) {
    throw new HttpError(400, "Hacker name is required.");
  }
  if (displayName.length > 40) {
    throw new HttpError(400, "Hacker name must be 40 characters or less.");
  }

  const avatarId = String(source.avatarId || "spider").trim();
  if (!/^[a-z0-9-]{1,40}$/i.test(avatarId)) {
    throw new HttpError(400, "Avatar id can only use letters, numbers, and dashes.");
  }

  if (!Array.isArray(source.roles) || source.roles.length === 0) {
    throw new HttpError(400, "Pick at least one role.");
  }

  const roles = [];
  for (const roleId of source.roles) {
    const role = roleById(String(roleId));
    if (!role) {
      throw new HttpError(400, "Pick a role from the list: architect, interface, visionary, or mastermind.");
    }
    if (!roles.includes(role.id)) {
      roles.push(role.id);
    }
  }

  const projectIdea = String(source.projectIdea || "").trim();
  if (projectIdea.length > 500) {
    throw new HttpError(400, "Project idea must be 500 characters or less.");
  }

  const tracks = parseTracks(source.tracks);
  if (tracks.join(", ").length > 300) {
    throw new HttpError(400, "Tracks text must be 300 characters or less.");
  }

  return { displayName, avatarId, roles, projectIdea, tracks };
}

function profileFromRow(row) {
  const roleRows = getDb().prepare(
    "SELECT role_id FROM user_roles WHERE user_id = ?"
  ).all(row.id);
  const selected = new Set(roleRows.map((roleRow) => roleRow.role_id));

  return {
    userId: row.id,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    roles: config.roles.filter((role) => selected.has(role.id)),
    projectIdea: row.project_idea,
    tracks: parseTracks(row.tracks_text)
  };
}

function getUser(userId) {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return row ? profileFromRow(row) : null;
}

function listUsers() {
  return getDb().prepare("SELECT * FROM users ORDER BY created_at").all().map(profileFromRow);
}

function saveRoles(userId, roles) {
  const db = getDb();
  db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(userId);
  const insert = db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)");
  for (const roleId of roles) {
    insert.run(userId, roleId);
  }
}

function addWelcomeLikes(userId) {
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO swipes
      (id, from_user_id, to_user_id, action, created_at)
    VALUES (?, ?, ?, 'like', ?)
  `);
  const createdAt = now();

  for (const sample of samples) {
    if (sample.alreadyLikesNewHackers && sample.id !== userId) {
      insert.run(newId("swipe"), sample.id, userId, createdAt);
    }
  }
}

function createUser(body) {
  const input = readProfileInput(body);
  const userId = newId("user");
  getDb().prepare(`
    INSERT INTO users
      (id, display_name, avatar_id, project_idea, tracks_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    input.displayName,
    input.avatarId,
    input.projectIdea,
    input.tracks.join(", "),
    now()
  );
  saveRoles(userId, input.roles);
  addWelcomeLikes(userId);
  return getUser(userId);
}

function updateUser(userId, body) {
  if (!getUser(userId)) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const input = readProfileInput(body);
  getDb().prepare(`
    UPDATE users
    SET display_name = ?, avatar_id = ?, project_idea = ?, tracks_text = ?
    WHERE id = ?
  `).run(
    input.displayName,
    input.avatarId,
    input.projectIdea,
    input.tracks.join(", "),
    userId
  );
  saveRoles(userId, input.roles);
  return getUser(userId);
}

module.exports = {
  createUser,
  updateUser,
  getUser,
  listUsers,
  parseTracks
};
