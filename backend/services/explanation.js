const { sharedTracks, complementaryRoles } = require("./matching");
const { joinList } = require("../lib/helpers");
const { rewriteWhy } = require("./gemini");

function templateForUser(me, them) {
  const shared = sharedTracks(me.tracks, them.tracks);
  const complementary = complementaryRoles(me, them).map((role) => role.name);
  const sharedRoles = me.roles
    .filter((role) => them.roles.some((theirRole) => theirRole.id === role.id))
    .map((role) => role.name);
  const sentences = [];

  if (shared.length > 0) {
    sentences.push(`You both listed ${joinList(shared)}.`);
  }
  if (complementary.length > 0) {
    sentences.push(`You are ${joinList(me.roles.map((role) => role.name))}, and ${them.displayName} is ${joinList(complementary)}.`);
  } else if (sharedRoles.length > 0) {
    sentences.push(`You both picked ${joinList(sharedRoles)}.`);
  }
  if (sentences.length === 0) {
    sentences.push(`${them.displayName} is ready to build. Connect if you want them on your squad.`);
  }

  return {
    source: "template",
    text: sentences.join(" "),
    sharedTracks: shared,
    complementaryRoles: complementary
  };
}

function templateForPair(left, right) {
  const shared = sharedTracks(left.tracks, right.tracks);
  const onlyLeft = complementaryRoles(right, left).map((role) => role.name);
  const onlyRight = complementaryRoles(left, right).map((role) => role.name);
  const sentences = [];

  if (shared.length > 0) {
    sentences.push(`${left.displayName} and ${right.displayName} both listed ${joinList(shared)}.`);
  }

  const roleParts = [];
  if (onlyLeft.length > 0) {
    roleParts.push(`${left.displayName} is ${joinList(onlyLeft)}`);
  }
  if (onlyRight.length > 0) {
    roleParts.push(`${right.displayName} is ${joinList(onlyRight)}`);
  }
  if (roleParts.length > 0) {
    sentences.push(`${roleParts.join(", and ")}.`);
  }
  if (sentences.length === 0) {
    sentences.push(`${left.displayName} and ${right.displayName} are ready to build together.`);
  }

  return {
    source: "template",
    text: sentences.join(" "),
    sharedTracks: shared,
    complementaryRoles: [...onlyLeft, ...onlyRight]
  };
}

async function askAboutPair(me, them, question) {
  const why = templateForUser(me, them);
  try {
    const text = await rewriteWhy({ me, them, why, question });
    if (text) {
      why.source = "gemini";
      why.text = text;
    }
  } catch (error) {
    console.error("Gemini fallback:", error.message);
  }
  return why;
}

module.exports = { templateForUser, templateForPair, askAboutPair };
