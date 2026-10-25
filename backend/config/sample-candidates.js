// Fake hackers so the Match Deck has cards before real people sign up.
// alreadyLikesNewHackers is demo-only. Those people already pressed Connect
// on each new profile, so one laptop can produce a squad match.

module.exports = [
  {
    id: "user_gwen",
    displayName: "Gwen Stacy",
    avatarId: "spider",
    roles: ["interface"],
    projectIdea: "A comic reader for hackathon teams",
    tracks: "Meta Challenge",
    alreadyLikesNewHackers: true
  },
  {
    id: "user_miles",
    displayName: "Miles Morales",
    avatarId: "spider",
    roles: ["architect"],
    projectIdea: "A squad map that shows where teammates are",
    tracks: "Jester's Court track",
    alreadyLikesNewHackers: false
  },
  {
    id: "user_may",
    displayName: "May Parker",
    avatarId: "spider",
    roles: ["mastermind"],
    projectIdea: "A pitch coach for comic-themed demos",
    tracks: "Meta Challenge",
    alreadyLikesNewHackers: true
  },
  {
    id: "user_hobie",
    displayName: "Hobie Brown",
    avatarId: "spider",
    roles: ["visionary"],
    projectIdea: "A comic UI kit for hackathon pages",
    tracks: "Design track",
    alreadyLikesNewHackers: false
  }
];
