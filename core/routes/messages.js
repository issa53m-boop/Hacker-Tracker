const express = require("express");
const { sendMessage, listMessages } = require("../services/messages");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  res.status(201).json(await sendMessage(body.matchId, body.fromUserId, body.text));
}));

router.get("/:matchId/messages", asyncRoute(async (req, res) => {
  res.json({ messages: await listMessages(req.params.matchId, req.query.userId) });
}));

module.exports = router;
