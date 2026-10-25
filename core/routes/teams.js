const express = require("express");
const { createTeam, listTeams } = require("../services/teams");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();
const listRouter = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  res.status(201).json(await createTeam(body.matchId, body.projectName, body.creatorUserId));
}));

listRouter.get("/:userId/teams", asyncRoute(async (req, res) => {
  res.json({ teams: await listTeams(req.params.userId) });
}));

module.exports = { router, listRouter };
