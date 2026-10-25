const { HttpError } = require("../lib/helpers");

function matchingUrl(path) {
  const configured = process.env.MATCHING_API_URL || "http://127.0.0.1:3001";
  const base = configured.endsWith("/") ? configured : `${configured}/`;
  return new URL(String(path).replace(/^\//, ""), base);
}

async function getJson(path) {
  let response;
  try {
    response = await fetch(matchingUrl(path));
  } catch {
    throw new HttpError(503, "The matching server is not running.");
  }

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new HttpError(502, "The matching server could not confirm that.");
  }
  return response.json();
}

async function getMatch(matchId) {
  const match = await getJson(`/api/matches/${encodeURIComponent(matchId)}`);
  if (!match) {
    throw new HttpError(404, "That match was not found.");
  }
  return match;
}

async function getUser(userId) {
  const user = await getJson(`/api/users/${encodeURIComponent(userId)}`);
  if (!user) {
    throw new HttpError(404, "That hacker was not found.");
  }
  return user;
}

async function squadIds(userId) {
  const data = await getJson(`/api/users/${encodeURIComponent(userId)}/matches`);
  if (!data) {
    throw new HttpError(404, "That hacker was not found.");
  }

  const ids = new Set([userId]);
  for (const match of data.matches || []) {
    if (match.partner && match.partner.userId) {
      ids.add(match.partner.userId);
    }
  }
  return ids;
}

function memberIds(match) {
  if (Array.isArray(match.users) && match.users.length === 2) {
    return match.users;
  }
  return (match.people || []).map((person) => person.userId);
}

module.exports = { getMatch, getUser, squadIds, memberIds };
