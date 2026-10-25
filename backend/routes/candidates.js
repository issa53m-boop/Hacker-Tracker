const express = require("express");
const { listCandidates } = require("../services/matching");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.get("/:userId/candidates", asyncRoute(async (req, res) => {
  res.json({ candidates: await listCandidates(req.params.userId) });
}));

module.exports = router;
