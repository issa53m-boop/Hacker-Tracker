const express = require("express");
const { checkIn, getCheckIn } = require("../services/checkins");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();
const statusRouter = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  const body = req.body || {};
  res.json(await checkIn(body.userId, body.code));
}));

statusRouter.get("/:userId/check-in", asyncRoute(async (req, res) => {
  res.json(await getCheckIn(req.params.userId));
}));

module.exports = { router, statusRouter };
