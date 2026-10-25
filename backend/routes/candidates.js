const express = require("express");
const { listCandidates } = require("../services/matching");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.get("/:userId/candidates", asyncRoute((req, res) => {
  res.json({ candidates: listCandidates(req.params.userId) });
}));

module.exports = router;
