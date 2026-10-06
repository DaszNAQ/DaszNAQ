import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderGistCard } from "./render.js";

const zodiac = {
  id: "aries",
  sign: "Aries",
  symbol: "♈",
  element: "Fire",
  planet: "Mars",
  title: "The Pioneer",
  description: "You ship fast.",
  statKeys: ["builder", "explorer", "debugger"],
};

const profile = {
  username: "alice",
  name: "Alice",
  stars: 10,
  publicRepos: 5,
  followers: 3,
  languages: [{ name: "JS" }],
};

describe("renderGistCard stats", () => {
  it("prints unbounded scores without a percent cap and scales bars to the peak", () => {
    const text = renderGistCard({
      profile,
      zodiac,
      stats: {
        builder: 200,
        explorer: 100,
        debugger: 50,
        consistency: 1,
        openSource: 1,
      },
    });

    assert.doesNotMatch(text, /\d+%/);
    assert.match(text, /Builder\s+████████████\s+200/);
    assert.match(text, /Explorer\s+██████░░░░░░\s+100/);
    assert.match(text, /Debugger\s+███░░░░░░░░░\s+50/);
  });
});
