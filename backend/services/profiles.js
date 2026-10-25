const config = require("../config/profile.config");
const samples = require("../config/sample-candidates");
const { query } = require("../db/database");
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

async function profileFromRow(row) {
  const roleRows = await query("SELECT role_id FROM user_roles WHERE user_id = ?", [row.id]);
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

async function getUser(userId) {
  const rows = await query("SELECT * FROM users WHERE id = ?", [userId]);
  return rows[0] ? profileFromRow(rows[0]) : null;
}

async function listUsers() {
  const rows = await query("SELECT * FROM users ORDER BY created_at");
  return Promise.all(rows.map((row) => profileFromRow(row)));
}

async function saveRoles(userId, roles) {
  await query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
  for (const roleId of roles) {
    await query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
  }
}

async function addWelcomeLikes(userId) {
  const createdAt = now();
  for (const sample of samples) {
    if (sample.alreadyLikesNewHackers && sample.id !== userId) {
      await query(`
        INSERT INTO swipes (id, from_user_id, to_user_id, action, created_at)
        VALUES (?, ?, ?, 'like', ?)
        ON CONFLICT (from_user_id, to_user_id) DO NOTHING
      `, [newId("swipe"), sample.id, userId, createdAt]);
    }
  }
}

async function createUser(body) {
  const input = readProfileInput(body);
  const userId = newId("user");
  await query(`
    INSERT INTO users
      (id, display_name, avatar_id, project_idea, tracks_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    userId,
    input.displayName,
    input.avatarId,
    input.projectIdea,
    input.tracks.join(", "),
    now()
  ]);
  await saveRoles(userId, input.roles);
  await addWelcomeLikes(userId);
  return getUser(userId);
}

async function updateUser(userId, body) {
  if (!(await getUser(userId))) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const input = readProfileInput(body);
  await query(`
    UPDATE users
    SET display_name = ?, avatar_id = ?, project_idea = ?, tracks_text = ?
    WHERE id = ?
  `, [
    input.displayName,
    input.avatarId,
    input.projectIdea,
    input.tracks.join(", "),
    userId
  ]);
  await saveRoles(userId, input.roles);
  return getUser(userId);
}

module.exports = {
  createUser,
  updateUser,
  getUser,
  listUsers,
  parseTracks
};
