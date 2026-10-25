const { getUser } = require("./profiles");
const { listCandidates } = require("./matching");
const { HttpError } = require("../lib/helpers");

// Loads the two people an "ask why" request is about.
// Both lookups are async. Callers must wait, or the profiles are still promises.
async function resolveAskPair(body, deps = {}) {
  const loadUser = deps.getUser || getUser;
  const loadCandidates = deps.listCandidates || listCandidates;
  const source = body || {};

  const me = await loadUser(source.userId);
  if (!me) {
    throw new HttpError(404, "That hacker was not found.");
  }

  let them = null;
  if (source.candidateUserId) {
    them = await loadUser(source.candidateUserId);
    if (!them) {
      throw new HttpError(404, "That hacker was not found.");
    }
  } else {
    const deck = await loadCandidates(me.userId);
    them = deck[0] || null;
  }
  if (!them) {
    throw new HttpError(400, "There is nobody left on the match deck.");
  }

  const question = String(source.question || "Why would we make a good squad?").trim();
  return { me, them, question };
}

module.exports = { resolveAskPair };
