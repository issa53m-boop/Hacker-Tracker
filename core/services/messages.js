const { getDb } = require("../db/database");
const { getMatch, memberIds } = require("./matchingClient");
const { HttpError, newId, now } = require("../lib/helpers");

async function confirmedMembers(matchId) {
  const match = await getMatch(matchId);
  const members = memberIds(match);
  if (members.length !== 2) {
    throw new HttpError(502, "The matching server could not confirm that.");
  }
  return members;
}

function requireMember(members, userId) {
  if (!members.includes(userId)) {
    throw new HttpError(403, "Only the two matched hackers can do that.");
  }
}

async function sendMessage(matchId, fromUserId, text) {
  if (!matchId || !fromUserId) {
    throw new HttpError(400, "matchId and fromUserId are required.");
  }

  const message = String(text || "").trim();
  if (!message) {
    throw new HttpError(400, "Message text is required.");
  }
  if (message.length > 500) {
    throw new HttpError(400, "Message must be 500 characters or less.");
  }

  const members = await confirmedMembers(matchId);
  requireMember(members, fromUserId);

  const row = {
    id: newId("message"),
    match_id: matchId,
    from_user_id: fromUserId,
    text: message,
    created_at: now()
  };
  getDb().prepare(`
    INSERT INTO messages (id, match_id, from_user_id, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(row.id, row.match_id, row.from_user_id, row.text, row.created_at);

  return {
    messageId: row.id,
    matchId: row.match_id,
    fromUserId: row.from_user_id,
    text: row.text,
    createdAt: row.created_at
  };
}

async function listMessages(matchId, userId) {
  if (!userId) {
    throw new HttpError(400, "userId is required.");
  }
  const members = await confirmedMembers(matchId);
  requireMember(members, userId);

  const rows = getDb().prepare(`
    SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC
  `).all(matchId);

  return rows.map((row) => ({
    messageId: row.id,
    matchId: row.match_id,
    fromUserId: row.from_user_id,
    text: row.text,
    createdAt: row.created_at
  }));
}

module.exports = { sendMessage, listMessages };
