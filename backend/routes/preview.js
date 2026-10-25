const express = require("express");
const { listUsers, getUser } = require("../services/profiles");
const { listMatchRows } = require("../services/matching");
const { templateForUser } = require("../services/explanation");
const { asyncRoute } = require("../lib/helpers");

const router = express.Router();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

router.get("/", asyncRoute(async (req, res) => {
  const people = await listUsers();
  const blocks = [];
  for (const person of people) {
    const rows = await listMatchRows(person.userId);
    const matches = [];
    for (const row of rows) {
      const partnerId = row.user_low_id === person.userId ? row.user_high_id : row.user_low_id;
      const partner = await getUser(partnerId);
      const why = templateForUser(person, partner);
      matches.push(`<li><strong>${escapeHtml(partner.displayName)}</strong> — ${escapeHtml(why.text)}</li>`);
    }
    const squad = matches.length ? `<ul>${matches.join("")}</ul>` : "<p>No squad members yet.</p>";
    const roles = person.roles.map((role) => role.name).join(", ");
    blocks.push(`<section><h2>${escapeHtml(person.displayName)}</h2><p>${escapeHtml(roles)}</p>${squad}</section>`);
  }

  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Hacker Tracker backend test</title>
  <style>
    body { font-family: Georgia, serif; margin: 40px; background: #ffffff; color: #111111; }
    h1 { font-size: 32px; }
    p, li { font-size: 20px; line-height: 1.4; }
  </style>
</head>
<body>
  <h1>Your backend is working</h1>
  <p>This is a test page for the matching server. The comic website is separate.</p>
  <p>Ask Muse Spark is ready at the server. It uses the plain match sentence until a Muse key is added on this computer.</p>
  ${blocks.join("")}
</body>
</html>`);
}));

module.exports = router;
