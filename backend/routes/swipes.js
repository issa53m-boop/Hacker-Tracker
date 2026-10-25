const express = require("express");
const { recordSwipe } = require("../services/matching");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  res.json(await recordSwipe(body.fromUserId, body.toUserId, body.action));
}));

module.exports = router;
