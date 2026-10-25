const express = require("express");
const { createUser, updateUser, getUser } = require("../services/profiles");
const { HttpError, asyncRoute } = require("../lib/helpers");

const router = express.Router();

router.post("/", asyncRoute((req, res) => {
  res.status(201).json(createUser(req.body));
}));

router.get("/:userId", asyncRoute((req, res) => {
  const user = getUser(req.params.userId);
  if (!user) {
    throw new HttpError(404, "That hacker was not found.");
  }
  res.json(user);
}));

router.put("/:userId", asyncRoute((req, res) => {
  res.json(updateUser(req.params.userId, req.body));
}));

module.exports = router;
