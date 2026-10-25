const { getDb } = require("../db/database");
const { getUser } = require("./matchingClient");
const { HttpError, now } = require("../lib/helpers");

function expectedCode() {
  return process.env.CHECK_IN_CODE || "THWIP";
}

async function checkIn(userId, code) {
  if (!userId) {
    throw new HttpError(400, "userId is required.");
  }
  if (String(code || "").trim().toUpperCase() !== expectedCode().toUpperCase()) {
    throw new HttpError(400, "That check-in code is wrong.");
  }

  await getUser(userId);
  const existing = getDb().prepare("SELECT * FROM checkins WHERE user_id = ?").get(userId);
  if (existing) {
    return { userId, checkedIn: true, checkedInAt: existing.checked_in_at };
  }

  const checkedInAt = now();
  getDb().prepare("INSERT INTO checkins (user_id, checked_in_at) VALUES (?, ?)").run(userId, checkedInAt);
  return { userId, checkedIn: true, checkedInAt };
}

async function getCheckIn(userId) {
  await getUser(userId);
  const row = getDb().prepare("SELECT * FROM checkins WHERE user_id = ?").get(userId);
  if (!row) {
    return { userId, checkedIn: false };
  }
  return { userId, checkedIn: true, checkedInAt: row.checked_in_at };
}

module.exports = { checkIn, getCheckIn };
