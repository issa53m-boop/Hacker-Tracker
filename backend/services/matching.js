const config = require("../config/profile.config");
const { query } = require("../db/database");
const { getUser, listUsers } = require("./profiles");
const { HttpError, newId, now } = require("../lib/helpers");

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "with", "for", "to", "of", "in", "on", "my", "our", "app"
]);

function words(text) {
  return (String(text || "").toLowerCase().match(/[a-z0-9']+/g) || [])
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function sharedTracks(left, right) {
  const rightKeys = new Map(right.map((track) => [track.toLowerCase(), track]));
  return left.filter((track) => rightKeys.has(track.toLowerCase()));
}

function complementaryRoles(me, them) {
  const mine = new Set(me.roles.map((role) => role.id));
  return them.roles.filter((role) => !mine.has(role.id));
}

function sharedProjectWords(me, them) {
  const theirs = new Set(words(them.projectIdea));
  return [...new Set(words(me.projectIdea))].filter((word) => theirs.has(word));
}

function scorePair(me, them) {
  const points = config.scoring;
  return (
    sharedTracks(me.tracks, them.tracks).length * points.sharedTrackPoints +
    complementaryRoles(me, them).length * points.complementaryRolePoints +
    sharedProjectWords(me, them).length * points.sharedProjectWordPoints
  );
}

function normalizeAction(action) {
  const key = String(action || "").trim().toLowerCase();
  if (key === "like" || key === "connect") {
    return "like";
  }
  if (key === "pass" || key === "maybe-later" || key === "maybe_later") {
    return "pass";
  }
  throw new HttpError(400, "Action must be connect or maybe later.");
}

function swipeJson(row) {
  return {
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    action: row.action
  };
}

function matchBrief(row) {
  return {
    matchId: row.id,
    users: [row.user_low_id, row.user_high_id],
    createdAt: row.created_at
  };
}

async function findMatchRow(userId, otherUserId) {
  const [low, high] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  const rows = await query(
    "SELECT * FROM matches WHERE user_low_id = ? AND user_high_id = ?",
    [low, high]
  );
  return rows[0] || null;
}

async function createMatch(userId, otherUserId) {
  const existing = await findMatchRow(userId, otherUserId);
  if (existing) {
    return matchBrief(existing);
  }

  const [low, high] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  const row = {
    id: newId("match"),
    user_low_id: low,
    user_high_id: high,
    created_at: now()
  };
  await query(`
    INSERT INTO matches (id, user_low_id, user_high_id, created_at)
    VALUES (?, ?, ?, ?)
  `, [row.id, row.user_low_id, row.user_high_id, row.created_at]);
  return matchBrief(row);
}

async function recordSwipe(fromUserId, toUserId, action) {
  if (!fromUserId || !toUserId) {
    throw new HttpError(400, "fromUserId and toUserId are required.");
  }
  if (fromUserId === toUserId) {
    throw new HttpError(400, "You cannot connect with yourself.");
  }

  const from = await getUser(fromUserId);
  const to = await getUser(toUserId);
  if (!from || !to) {
    throw new HttpError(404, "One of those hackers was not found.");
  }

  const savedAction = normalizeAction(action);
  const existingRows = await query(
    "SELECT * FROM swipes WHERE from_user_id = ? AND to_user_id = ?",
    [fromUserId, toUserId]
  );
  const existing = existingRows[0];

  if (existing) {
    return {
      swipe: swipeJson(existing),
      match: existing.action === "like" ? matchBriefOrNull(await findMatchRow(fromUserId, toUserId)) : null
    };
  }

  await query(`
    INSERT INTO swipes (id, from_user_id, to_user_id, action, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [newId("swipe"), fromUserId, toUserId, savedAction, now()]);

  let match = null;
  if (savedAction === "like") {
    const reverse = await query(`
      SELECT id FROM swipes
      WHERE from_user_id = ? AND to_user_id = ? AND action = 'like'
    `, [toUserId, fromUserId]);
    if (reverse[0]) {
      match = await createMatch(fromUserId, toUserId);
    }
  }

  return {
    swipe: { fromUserId, toUserId, action: savedAction },
    match
  };
}

function matchBriefOrNull(row) {
  return row ? matchBrief(row) : null;
}

async function listCandidates(userId) {
  const me = await getUser(userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const swipedRows = await query("SELECT to_user_id FROM swipes WHERE from_user_id = ?", [userId]);
  const swiped = new Set(swipedRows.map((row) => row.to_user_id));

  return (await listUsers())
    .filter((person) => person.userId !== userId && !swiped.has(person.userId))
    .map((person) => ({ person, score: scorePair(me, person) }))
    .sort((left, right) => right.score - left.score || left.person.displayName.localeCompare(right.person.displayName))
    .map((entry) => entry.person);
}

function roleMatches(partner, roleQuery) {
  const query = String(roleQuery).trim().toLowerCase();
  return partner.roles.some((role) => {
    return role.id === query || role.name.toLowerCase() === query || role.name.toLowerCase() === `the ${query}`;
  });
}

async function listMatchRows(userId) {
  return query(`
    SELECT * FROM matches
    WHERE user_low_id = ? OR user_high_id = ?
    ORDER BY created_at DESC
  `, [userId, userId]);
}

async function getMatchRow(matchId) {
  const rows = await query("SELECT * FROM matches WHERE id = ?", [matchId]);
  return rows[0] || null;
}

module.exports = {
  sharedTracks,
  complementaryRoles,
  recordSwipe,
  listCandidates,
  roleMatches,
  listMatchRows,
  getMatchRow
};
