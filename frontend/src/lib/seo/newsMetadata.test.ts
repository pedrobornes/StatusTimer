import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GamingNews } from "../../types/api";
import {
  buildNewsArticleDescription,
  buildNewsArticleTitle,
} from "./newsMetadata";

function article(partial: Partial<GamingNews> & Pick<GamingNews, "title" | "content">): GamingNews {
  return {
    id: 1,
    slug: "game-article",
    gameTag: "seven-days-to-die",
    gameName: "7 Days to Die",
    createdAt: "2026-07-30T12:00:00Z",
    publishedAt: "2026-07-30T12:00:00Z",
    ...partial,
  };
}

describe("buildNewsArticleTitle", () => {
  it("uses Game: title when display title has update/version signals", () => {
    const news = article({
      title: "V3.1.0 Update",
      content: "Balance changes and fixes across systems.",
    });

    assert.equal(
      buildNewsArticleTitle(news, "7 Days to Die", "V3.1.0 Update"),
      "7 Days to Die: V3.1.0 Update",
    );
  });

  it("uses Patch Notes template for generic patch notes without version signal", () => {
    const news = article({
      title: "Weekly maintenance notes",
      content: "Official patch notes for this week's maintenance break.",
    });

    assert.equal(
      buildNewsArticleTitle(news, "World of Warcraft", "Weekly maintenance notes"),
      "World of Warcraft Patch Notes: Weekly maintenance notes",
    );
  });

  it("uses News fallback for generic articles", () => {
    const news = article({
      title: "Community spotlight",
      content: "A long-form community story without patch language or versions.",
    });

    assert.equal(
      buildNewsArticleTitle(news, "Rust", "Community spotlight"),
      "Community spotlight | Rust News",
    );
  });
});

describe("buildNewsArticleDescription", () => {
  it("prefixes a real excerpt with a short published date", () => {
    const body =
      "The July hotfix addresses matchmaking queues, inventory sync issues, " +
      "and several crash reports from console players during peak hours.";
    const news = article({
      title: "July hotfix",
      content: body,
      publishedAt: "2026-07-30T15:00:00Z",
    });

    const description = buildNewsArticleDescription(news, "Valorant");

    assert.match(description, /^Jul 30, 2026 — /);
    assert.ok(description.length >= 140);
    assert.ok(description.length <= 200);
    assert.ok(!description.includes("official developer news on StatusTimer"));
  });
});
