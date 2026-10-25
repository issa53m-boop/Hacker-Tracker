const express = require("express");
const { getUser } = require("../services/profiles");
const { listCandidates } = require("../services/matching");
const { templateForUser } = require("../services/explanation");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.get("/:userId/candidates", asyncRoute(async (req, res) => {
  const me = await getUser(req.params.userId);
  const people = await listCandidates(req.params.userId);
  res.json({
    candidates: people.map((person) => ({
      ...person,
      why: templateForUser(me, person)
    }))
  });
}));

module.exports = router;
