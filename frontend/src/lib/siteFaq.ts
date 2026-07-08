export interface SiteFaqItem {
  question: string;
  answer: string;
}

export const SITE_FAQ_ITEMS: SiteFaqItem[] = [
  {
    question: "What is StatusTimer?",
    answer:
      "StatusTimer is an independent platform that tracks multiplayer game server status, player counts, Twitch viewership, release dates, and game-specific news. We aggregate publicly available signals to help players understand whether a game may be experiencing issues.",
  },
  {
    question: "Is StatusTimer affiliated with any game publisher?",
    answer:
      "No. StatusTimer is not affiliated with, endorsed by, or sponsored by any game company or platform listed on this site. All trademarks belong to their respective owners.",
  },
  {
    question: "How often is server status updated?",
    answer:
      "Update frequency depends on the game and data source. Monitored titles are checked on a recurring schedule. Timestamps on each game page show when data was last refreshed.",
  },
  {
    question: "Why does StatusTimer say a game is DOWN when I can still play?",
    answer:
      "Status reflects the signals we monitor (network probes, official status pages, or Steam API data). Local network issues, regional outages, or partial service degradation may differ from your experience. Use the incident log and timestamps for context.",
  },
  {
    question: "Where do news articles come from?",
    answer:
      "Game news is scoped per title and sourced from official channels when available, such as Steam news feeds and official subreddits linked from IGDB. We filter low-signal or off-topic posts.",
  },
  {
    question: "How do I report incorrect data?",
    answer:
      "Use the Contact page once our support email is live, or check back soon. Include the game name, what looks wrong, and when you noticed it.",
  },
];
