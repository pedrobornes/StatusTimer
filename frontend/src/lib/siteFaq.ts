import { CONTACT_EMAIL } from "@/config/site";
import { MONITORED_SOCIAL_PLATFORMS_TEXT } from "@/config/seo";

export interface SiteFaqItem {
  question: string;
  answer: string;
}

export const SITE_FAQ_ITEMS: SiteFaqItem[] = [
  {
    question: "What is StatusTimer?",
    answer:
      `StatusTimer is an independent platform that tracks multiplayer game server status (online, down, or maintenance), social platform connectivity for ${MONITORED_SOCIAL_PLATFORMS_TEXT}, release dates, and official patch notes per game. We aggregate publicly available signals to help players understand whether a game or platform may be experiencing issues.`,
  },
  {
    question: "Is StatusTimer affiliated with any game publisher?",
    answer:
      "No. StatusTimer is not affiliated with, endorsed by, or sponsored by any game company or platform listed on this site. All trademarks belong to their respective owners.",
  },
  {
    question: "Which social platforms does StatusTimer monitor?",
    answer:
      `We check connectivity for ${MONITORED_SOCIAL_PLATFORMS_TEXT}. These appear in the Social Platforms panel on the home monitor and in the incident log when a platform looks unreachable.`,
  },
  {
    question: "What do ONLINE, DOWN, and MAINTENANCE mean for games?",
    answer:
      "ONLINE means our monitored signals suggest the game's servers are reachable. DOWN means we detected a problem consistent with an outage or connectivity failure. MAINTENANCE means the game or publisher has indicated scheduled work or limited availability. Labels are informational — always check the timestamp on each page to see how fresh the data is.",
  },
  {
    question: "What do ONLINE and DOWN mean for social platforms?",
    answer:
      "These reflect whether we can reach each platform from our monitoring checks. A DOWN label does not always mean the app is globally offline — regional issues, your ISP, or local network problems can differ from what we see. Use the last-checked time for context.",
  },
  {
    question: "How often is status updated?",
    answer:
      "Update frequency depends on the game or platform and the data source behind it. Monitored titles and social services are checked on a recurring schedule. Every card and status page shows when data was last refreshed so you can judge how current it is.",
  },
  {
    question: "Why does StatusTimer say a game is DOWN when I can still play?",
    answer:
      "Status reflects the signals we monitor — official status pages and our own connectivity checks. Local network issues, regional outages, or partial service degradation may differ from your experience. Use the incident log, uptime timeline, and timestamps for context.",
  },
  {
    question: "Why do some games show player counts but no live server status?",
    answer:
      "Some catalog titles include public audience data — such as Steam player counts or Twitch viewership — without active server probing. Those games still have a status page for news and media, but server uptime may be marked as unavailable until a supported probe is in place.",
  },
  {
    question: "What are upcoming releases and the hype counter?",
    answer:
      "The Releases section lists games with a future launch window. Each release page shows a countdown, platforms, trailers, and news when available. The hype counter lets visitors register interest — it is a community signal on StatusTimer, not an official preorder or wishlist count from any store.",
  },
  {
    question: "What is the difference between a release page and a status page?",
    answer:
      "A release page (/release/…) focuses on launch dates, countdowns, and pre-launch news for games that have not shipped yet. Once a game is live in our catalog, its release page redirects to the status page (/status/…), which tracks server health, incidents, player activity, and patch news.",
  },
  {
    question: "Where do news articles come from?",
    answer:
      "From official publisher channels — developer blogs, store news, and similar first-party sources for each game. Articles are grouped on that game's status page, and we skip low-quality or off-topic items. Full posts are also available at /news/[slug].",
  },
  {
    question: "Is StatusTimer free to use?",
    answer:
      "Yes. Browsing server status, social platform checks, release countdowns, and game news is free. We may display advertising in the future; any monetization will be disclosed in our legal pages as it is introduced.",
  },
  {
    question: "Do you sell or share my personal data?",
    answer:
      `We do not sell personal data. We process limited technical and usage information to operate the site — see our Privacy Policy for full details. For corrections or data questions, contact ${CONTACT_EMAIL}.`,
  },
  {
    question: "Can I request a new game or platform to be tracked?",
    answer:
      `Yes. Use the Contact page or email ${CONTACT_EMAIL} with the game or platform name and, if possible, a link to an official status page or store listing. We prioritize titles with reliable public signals and active player demand.`,
  },
  {
    question: "Do you list adult or sexually explicit games?",
    answer:
      "No. We filter adult-only and sexually explicit Steam titles from search, the public catalog, upcoming releases, and indexable pages. If an inappropriate title appears, contact us with the page URL and we will review it.",
  },
  {
    question: "How do I report incorrect data?",
    answer:
      `Use the Contact page or email ${CONTACT_EMAIL}. Include the game or platform name, what looks wrong, the URL of the page, and when you noticed it. Screenshots help us investigate faster.`,
  },
];
