// Uses Gemini only when GEMINI_API_KEY is set. Callers keep the template text
// when this returns null or throws.

async function rewriteWhy({ me, them, why, question }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    "Write two short sentences for a hackathon teammate match.",
    "Use only the facts below. Do not invent tracks, roles, skills, or interests.",
    `Question: ${question || "Why would we make a good squad?"}`,
    `Person A: ${me.displayName}. Roles: ${me.roles.map((role) => role.name).join(", ") || "none"}. Tracks: ${me.tracks.join(", ") || "none"}. Project: ${me.projectIdea || "none"}.`,
    `Person B: ${them.displayName}. Roles: ${them.roles.map((role) => role.name).join(", ") || "none"}. Tracks: ${them.tracks.join(", ") || "none"}. Project: ${them.projectIdea || "none"}.`,
    `Shared tracks: ${why.sharedTracks.join(", ") || "none"}.`,
    `Roles only Person B has: ${why.complementaryRoles.join(", ") || "none"}.`
  ].join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 120, temperature: 0.4 }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini returned ${response.status}`);
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty answer");
  }

  return text;
}

module.exports = { rewriteWhy };
