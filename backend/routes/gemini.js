const express = require("express");
const { getUser } = require("../services/profiles");
const { listCandidates } = require("../services/matching");
const { askAboutPair } = require("../services/explanation");
const { HttpError, asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/ask", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const me = getUser(body.userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  let them = null;
  if (body.candidateUserId) {
    them = getUser(body.candidateUserId);
    if (!them) {
      throw new HttpError(404, "That hacker was not found.");
    }
  } else {
    them = listCandidates(me.userId)[0];
  }
  if (!them) {
    throw new HttpError(400, "There is nobody left on the match deck.");
  }

  const question = String(body.question || "Why would we make a good squad?").trim();
  res.json(await askAboutPair(me, them, question));
}));

module.exports = router;
