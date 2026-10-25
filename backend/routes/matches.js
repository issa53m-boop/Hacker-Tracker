const express = require("express");
const { getUser } = require("../services/profiles");
const { roleMatches, listMatchRows, getMatchRow } = require("../services/matching");
const { templateForUser, templateForPair } = require("../services/explanation");
const { HttpError, asyncRoute } = require("../lib/helpers");

const userMatches = express.Router();
const matchRouter = express.Router();

function partnerMatches(entry, query) {
  if (query.role && !roleMatches(entry.partner, query.role)) {
    return false;
  }
  if (!query.q) {
    return true;
  }
  const haystack = `${entry.partner.displayName} ${entry.partner.projectIdea}`.toLowerCase();
  return haystack.includes(String(query.q).trim().toLowerCase());
}

userMatches.get("/:userId/matches", asyncRoute(async (req, res) => {
  const me = await getUser(req.params.userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const rows = await listMatchRows(me.userId);
  const matches = [];
  for (const row of rows) {
    const partnerId = row.user_low_id === me.userId ? row.user_high_id : row.user_low_id;
    const partner = await getUser(partnerId);
    const entry = {
      matchId: row.id,
      users: [row.user_low_id, row.user_high_id],
      createdAt: row.created_at,
      partner,
      why: templateForUser(me, partner)
    };
    if (partnerMatches(entry, req.query)) {
      matches.push(entry);
    }
  }

  res.json({ matches });
}));

matchRouter.get("/:matchId", asyncRoute(async (req, res) => {
  const row = await getMatchRow(req.params.matchId);
  if (!row) {
    throw new HttpError(404, "That match was not found.");
  }

  const people = [await getUser(row.user_low_id), await getUser(row.user_high_id)];
  res.json({
    matchId: row.id,
    users: [row.user_low_id, row.user_high_id],
    people,
    createdAt: row.created_at,
    why: templateForPair(people[0], people[1])
  });
}));

module.exports = { userMatches, matchRouter };
