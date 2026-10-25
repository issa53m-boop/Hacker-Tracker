const config = require("../config/profile.config");
const { getDb } = require("../db/database");
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

function findMatchRow(userId, otherUserId) {
  const [low, high] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  return getDb().prepare(
    "SELECT * FROM matches WHERE user_low_id = ? AND user_high_id = ?"
  ).get(low, high);
}

function createMatch(userId, otherUserId) {
  const existing = findMatchRow(userId, otherUserId);
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
  getDb().prepare(`
    INSERT INTO matches (id, user_low_id, user_high_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(row.id, row.user_low_id, row.user_high_id, row.created_at);
  return matchBrief(row);
}

function recordSwipe(fromUserId, toUserId, action) {
  if (!fromUserId || !toUserId) {
    throw new HttpError(400, "fromUserId and toUserId are required.");
  }
  if (fromUserId === toUserId) {
    throw new HttpError(400, "You cannot connect with yourself.");
  }

  const from = getUser(fromUserId);
  const to = getUser(toUserId);
  if (!from || !to) {
    throw new HttpError(404, "One of those hackers was not found.");
  }

  const savedAction = normalizeAction(action);
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM swipes WHERE from_user_id = ? AND to_user_id = ?"
  ).get(fromUserId, toUserId);

  if (existing) {
    return {
      swipe: swipeJson(existing),
      match: existing.action === "like" ? matchBriefOrNull(findMatchRow(fromUserId, toUserId)) : null
    };
  }

  db.prepare(`
    INSERT INTO swipes (id, from_user_id, to_user_id, action, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(newId("swipe"), fromUserId, toUserId, savedAction, now());

  let match = null;
  if (savedAction === "like") {
    const reverse = db.prepare(`
      SELECT id FROM swipes
      WHERE from_user_id = ? AND to_user_id = ? AND action = 'like'
    `).get(toUserId, fromUserId);
    if (reverse) {
      match = createMatch(fromUserId, toUserId);
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

function listCandidates(userId) {
  const me = getUser(userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const swiped = new Set(
    getDb().prepare("SELECT to_user_id FROM swipes WHERE from_user_id = ?")
      .all(userId)
      .map((row) => row.to_user_id)
  );

  return listUsers()
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

function listMatchRows(userId) {
  return getDb().prepare(`
    SELECT * FROM matches
    WHERE user_low_id = ? OR user_high_id = ?
    ORDER BY created_at DESC
  `).all(userId, userId);
}

function getMatchRow(matchId) {
  return getDb().prepare("SELECT * FROM matches WHERE id = ?").get(matchId);
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
