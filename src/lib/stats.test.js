import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateStats,
  relativeFill,
  formatStatValue,
} from "./stats.js";

const sample = {
  publicRepos: 10,
  ageDays: 365,
  stars: 100,
  forks: 20,
  openIssues: 8,
  followers: 50,
  languages: [{ name: "JS" }, { name: "Python" }],
};

describe("calculateStats", () => {
  it("returns unbounded weighted scores, not a 0–100 scale", () => {
    const stats = calculateStats(sample);

    assert.equal(stats.consistency, 92);
    assert.equal(stats.explorer, 32);
    assert.equal(stats.builder, 134);
    assert.equal(stats.openSource, 225);
    assert.equal(stats.debugger, 65);
  });

  it("does not clamp high GitHub signals at 100", () => {
    const stats = calculateStats({
      publicRepos: 50,
      ageDays: 365,
      stars: 10000,
      forks: 500,
      openIssues: 0,
      followers: 2000,
      languages: [],
    });

    assert.equal(stats.builder, 8750);
    assert.equal(stats.openSource, 15000);
    assert.ok(stats.builder > 100);
    assert.ok(stats.openSource > 100);
  });

  it("caps only the account-age contribution at 40", () => {
    const stats = calculateStats({
      ...sample,
      publicRepos: 0,
      ageDays: 3650,
      stars: 0,
      forks: 0,
      openIssues: 0,
      followers: 0,
      languages: [],
    });

    assert.equal(stats.consistency, 40);
  });
});

describe("relativeFill", () => {
  it("fills the full width for the peak value among displayed stats", () => {
    assert.equal(relativeFill(200, 200, 12), 12);
    assert.equal(relativeFill(100, 200, 12), 6);
    assert.equal(relativeFill(50, 200, 12), 3);
  });

  it("returns empty fill when every stat is zero", () => {
    assert.equal(relativeFill(0, 0, 12), 0);
    assert.equal(relativeFill(40, 0, 160), 0);
  });
});

describe("formatStatValue", () => {
  it("keeps small scores as-is and compactifies thousands", () => {
    assert.equal(formatStatValue(72), "72");
    assert.equal(formatStatValue(134), "134");
    assert.equal(formatStatValue(1200), "1.2k");
    assert.equal(formatStatValue(15000), "15k");
  });
});
