const express = require("express");
const { resolveAskPair } = require("../services/askPair");
const { askAboutPair } = require("../services/explanation");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/ask", asyncRoute(async (req, res) => {
  const { me, them, question } = await resolveAskPair(req.body);
  res.json(await askAboutPair(me, them, question));
}));

module.exports = router;
