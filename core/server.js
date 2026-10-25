// Core server for Hacker Tracker.
// Messages, squad location, event check-in, and teams.
// Start it with: npm start
// It listens on http://localhost:3002

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { initDb } = require("./db/database");
const messages = require("./routes/messages");
const { router: locations, listRouter: locationLists } = require("./routes/locations");
const { router: checkins, statusRouter: checkInStatus } = require("./routes/checkins");
const { router: teams, listRouter: teamLists } = require("./routes/teams");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "hacker-tracker-core" });
});

app.use("/api/messages", messages);
app.use("/api/matches", messages);
app.use("/api/locations", locations);
app.use("/api/users", locationLists);
app.use("/api/check-in", checkins);
app.use("/api/users", checkInStatus);
app.use("/api/teams", teams);
app.use("/api/users", teamLists);

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

const port = Number(process.env.PORT) || 3002;

if (require.main === module) {
  initDb().then(() => {
    app.listen(port, () => {
      console.log(`Core server on http://localhost:${port}`);
    });
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;
