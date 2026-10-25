const { query } = require("../db/database");
const { getUser, squadIds } = require("./matchingClient");
const { HttpError, now } = require("../lib/helpers");

const SAMPLE_POINT = { latitude: 29.76, longitude: -95.37 };

function readPoint(body) {
  if (body.sample === true) {
    return SAMPLE_POINT;
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, "Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, "Longitude must be between -180 and 180.");
  }
  return { latitude, longitude };
}

async function setLocation(body) {
  const source = body || {};
  if (!source.userId) {
    throw new HttpError(400, "userId is required.");
  }
  if (typeof source.sharing !== "boolean") {
    throw new HttpError(400, "sharing must be true or false.");
  }

  await getUser(source.userId);

  if (!source.sharing) {
    await query("DELETE FROM locations WHERE user_id = ?", [source.userId]);
    return { userId: source.userId, sharing: false };
  }

  const point = readPoint(source);
  const updatedAt = now();
  await query(`
    INSERT INTO locations (user_id, latitude, longitude, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      updated_at = excluded.updated_at
  `, [source.userId, point.latitude, point.longitude, updatedAt]);

  return {
    userId: source.userId,
    sharing: true,
    latitude: point.latitude,
    longitude: point.longitude,
    updatedAt
  };
}

async function listVisibleLocations(userId) {
  const allowed = await squadIds(userId);
  const rows = await query("SELECT * FROM locations");
  return rows
    .filter((row) => allowed.has(row.user_id))
    .map((row) => ({
      userId: row.user_id,
      latitude: row.latitude,
      longitude: row.longitude,
      updatedAt: row.updated_at
    }));
}

module.exports = { setLocation, listVisibleLocations };
