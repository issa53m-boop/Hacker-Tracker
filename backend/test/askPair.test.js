const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveAskPair } = require("../services/askPair");

const me = { userId: "user_me", displayName: "Miles" };
const them = { userId: "user_gwen", displayName: "Gwen" };

test("waits for both saved profiles before asking why they match", async () => {
  const result = await resolveAskPair(
    { userId: "user_me", candidateUserId: "user_gwen", question: "Why us?" },
    {
      async getUser(id) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (id === "user_me") return me;
        if (id === "user_gwen") return them;
        return null;
      },
      async listCandidates() {
        throw new Error("The named candidate should be loaded directly.");
      }
    }
  );

  assert.equal(result.me, me);
  assert.equal(result.them, them);
  assert.equal(result.question, "Why us?");
});

test("uses the first person still on the deck when no candidate is named", async () => {
  const result = await resolveAskPair(
    { userId: "user_me" },
    {
      async getUser() {
        return me;
      },
      async listCandidates(userId) {
        assert.equal(userId, me.userId);
        return [them];
      }
    }
  );

  assert.equal(result.them, them);
  assert.equal(result.question, "Why would we make a good squad?");
});

test("says the hacker was not found when the profile is missing", async () => {
  await assert.rejects(
    () => resolveAskPair(
      { userId: "missing" },
      {
        async getUser() {
          return null;
        },
        async listCandidates() {
          return [];
        }
      }
    ),
    (error) => error.status === 404 && error.message === "That hacker was not found."
  );
});

test("says the deck is empty when there is nobody left to ask about", async () => {
  await assert.rejects(
    () => resolveAskPair(
      { userId: "user_me" },
      {
        async getUser() {
          return me;
        },
        async listCandidates() {
          return [];
        }
      }
    ),
    (error) => error.status === 400
  );
});
