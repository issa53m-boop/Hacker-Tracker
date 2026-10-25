const { getDb } = require("../db/database");
const { getMatch, getUser, memberIds } = require("./matchingClient");
const { HttpError, newId, now } = require("../lib/helpers");

function teamJson(row) {
  return {
    teamId: row.id,
    matchId: row.match_id,
    projectName: row.project_name,
    members: [row.member_low_id, row.member_high_id],
    createdAt: row.created_at
  };
}

async function createTeam(matchId, projectName, creatorUserId) {
  if (!matchId || !creatorUserId) {
    throw new HttpError(400, "matchId and creatorUserId are required.");
  }

  const name = String(projectName || "").trim();
  if (!name) {
    throw new HttpError(400, "Project name is required.");
  }
  if (name.length > 120) {
    throw new HttpError(400, "Project name must be 120 characters or less.");
  }

  const match = await getMatch(matchId);
  const members = memberIds(match);
  if (!members.includes(creatorUserId)) {
    throw new HttpError(403, "Only a hacker on that match can create the team.");
  }

  const [low, high] = members[0] < members[1] ? [members[0], members[1]] : [members[1], members[0]];
  const db = getDb();
  const existing = db.prepare("SELECT * FROM teams WHERE match_id = ?").get(matchId);
  if (existing) {
    return teamJson(existing);
  }

  const row = {
    id: newId("team"),
    match_id: matchId,
    project_name: name,
    creator_user_id: creatorUserId,
    member_low_id: low,
    member_high_id: high,
    created_at: now()
  };
  db.prepare(`
    INSERT INTO teams
      (id, match_id, project_name, creator_user_id, member_low_id, member_high_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(row.id, row.match_id, row.project_name, row.creator_user_id, row.member_low_id, row.member_high_id, row.created_at);
  return teamJson(row);
}

async function listTeams(userId) {
  await getUser(userId);
  const rows = getDb().prepare(`
    SELECT * FROM teams
    WHERE member_low_id = ? OR member_high_id = ?
    ORDER BY created_at DESC
  `).all(userId, userId);
  return rows.map(teamJson);
}

module.exports = { createTeam, listTeams };
