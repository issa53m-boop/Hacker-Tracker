const express = require("express");
const { createUser, updateUser, getUser } = require("../services/profiles");
const { HttpError, asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/", asyncRoute(async (req, res) => {
  res.status(201).json(await createUser(req.body));
}));

router.get("/:userId", asyncRoute(async (req, res) => {
  const user = await getUser(req.params.userId);
  if (!user) {
    throw new HttpError(404, "That hacker was not found.");
  }
  res.json(user);
}));

router.put("/:userId", asyncRoute(async (req, res) => {
  res.json(await updateUser(req.params.userId, req.body));
}));

module.exports = router;
