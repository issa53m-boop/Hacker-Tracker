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

userMatches.get("/:userId/matches", asyncRoute((req, res) => {
  const me = getUser(req.params.userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const matches = listMatchRows(me.userId).map((row) => {
    const partnerId = row.user_low_id === me.userId ? row.user_high_id : row.user_low_id;
    const partner = getUser(partnerId);
    return {
      matchId: row.id,
      users: [row.user_low_id, row.user_high_id],
      createdAt: row.created_at,
      partner,
      why: templateForUser(me, partner)
    };
  }).filter((entry) => partnerMatches(entry, req.query));

  res.json({ matches });
}));

matchRouter.get("/:matchId", asyncRoute((req, res) => {
  const row = getMatchRow(req.params.matchId);
  if (!row) {
    throw new HttpError(404, "That match was not found.");
  }

  const people = [getUser(row.user_low_id), getUser(row.user_high_id)];
  res.json({
    matchId: row.id,
    users: [row.user_low_id, row.user_high_id],
    people,
    createdAt: row.created_at,
    why: templateForPair(people[0], people[1])
  });
}));

module.exports = { userMatches, matchRouter };
