// Matching server for Hacker Tracker.
// Start it with: npm start
// It listens on http://localhost:3001

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const config = require("./config/profile.config");
const { initDb } = require("./db/database");
const users = require("./routes/users");
const candidates = require("./routes/candidates");
const swipes = require("./routes/swipes");
const { userMatches, matchRouter } = require("./routes/matches");
const gemini = require("./routes/gemini");

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "hacker-tracker-matching" });
});

app.get("/api/config", (req, res) => {
  res.json({ version: config.version, roles: config.roles });
});

app.use("/api/users", users);
app.use("/api/users", candidates);
app.use("/api/users", userMatches);
app.use("/api/swipes", swipes);
app.use("/api/matches", matchRouter);
app.use("/api/gemini", gemini);

app.use((err, req, res, next) => {
  if (err.status) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body must be JSON." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT) || 3001;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Matching server on http://localhost:${port}`);
  });
}

module.exports = app;
