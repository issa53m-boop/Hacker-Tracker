const express = require("express");
const { listUsers, getUser } = require("../services/profiles");
const { listMatchRows } = require("../services/matching");
const { templateForUser } = require("../services/explanation");

const router = express.Router();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

router.get("/", (req, res) => {
  const people = listUsers();
  const blocks = people.map((person) => {
    const matches = listMatchRows(person.userId).map((row) => {
      const partnerId = row.user_low_id === person.userId ? row.user_high_id : row.user_low_id;
      const partner = getUser(partnerId);
      const why = templateForUser(person, partner);
      return `<li><strong>${escapeHtml(partner.displayName)}</strong> — ${escapeHtml(why.text)}</li>`;
    });
    const squad = matches.length ? `<ul>${matches.join("")}</ul>` : "<p>No squad members yet.</p>";
    const roles = person.roles.map((role) => role.name).join(", ");
    return `<section><h2>${escapeHtml(person.displayName)}</h2><p>${escapeHtml(roles)}</p>${squad}</section>`;
  });

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
  ${blocks.join("")}
</body>
</html>`);
});

module.exports = router;
