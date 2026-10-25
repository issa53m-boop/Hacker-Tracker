// Edit this file when the role names change.
// The pages can load the role list from GET /api/config.
// Point values stay on the server. The browser never receives them.

module.exports = {
  version: "1",
  scoring: {
    sharedTrackPoints: 2,
    complementaryRolePoints: 3,
    sharedProjectWordPoints: 1
  },
  roles: [
    { id: "architect", name: "The Architect", track: "Backend" },
    { id: "interface", name: "The Interface", track: "Frontend" },
    { id: "visionary", name: "The Visionary", track: "Design / UI" },
    { id: "mastermind", name: "The Mastermind", track: "Pitch / PM" }
  ]
};
