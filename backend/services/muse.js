// Uses Muse Spark only when MODEL_API_KEY is set. Callers keep the template
// text when this returns null or throws.

function matchPrompt({ me, them, why, question }) {
  return [
    "Write two short sentences for a hackathon teammate match.",
    "Use only the facts below. Do not invent tracks, roles, skills, or interests.",
    `Question: ${question || "Why would we make a good squad?"}`,
    `Person A: ${me.displayName}. Roles: ${me.roles.map((role) => role.name).join(", ") || "none"}. Tracks: ${me.tracks.join(", ") || "none"}. Project: ${me.projectIdea || "none"}.`,
    `Person B: ${them.displayName}. Roles: ${them.roles.map((role) => role.name).join(", ") || "none"}. Tracks: ${them.tracks.join(", ") || "none"}. Project: ${them.projectIdea || "none"}.`,
    `Shared tracks: ${why.sharedTracks.join(", ") || "none"}.`,
    `Roles only Person B has: ${why.complementaryRoles.join(", ") || "none"}.`
  ].join("\n");
}

async function rewriteWhy(details) {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.MUSE_MODEL || "muse-spark-1.3";
  const response = await fetch("https://api.meta.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      input: matchPrompt(details)
    })
  });

  if (!response.ok) {
    throw new Error(`Muse Spark returned ${response.status}`);
  }

  const data = await response.json();
  const fromOutput = (data.output || [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text || "")
    .join("")
    .trim();
  const text = String(data.output_text || fromOutput).trim();

  if (!text) {
    throw new Error("Muse Spark returned an empty answer");
  }

  return text;
}

module.exports = { rewriteWhy };
