const express = require("express");
const { recordSwipe } = require("../services/matching");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/", asyncRoute((req, res) => {
  const body = req.body || {};
  res.json(recordSwipe(body.fromUserId, body.toUserId, body.action));
}));

module.exports = router;
