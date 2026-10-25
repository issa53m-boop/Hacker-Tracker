const express = require("express");
const { setLocation, listVisibleLocations } = require("../services/locations");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();
const listRouter = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  res.json(await setLocation(req.body));
}));

listRouter.get("/:userId/locations", asyncRoute(async (req, res) => {
  res.json({ locations: await listVisibleLocations(req.params.userId) });
}));

module.exports = { router, listRouter };
