import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateStats,
  relativeFill,
  formatStatValue,
} from "./stats.js";

const sample = {
  publicRepos: 12,
  originalRepos: 10,
  activeRepos: 4,
  mergedPRs: 3,
  stars: 100,
  forks: 20,
  openIssues: 8,
  followers: 50,
  languages: [{ name: "JS" }, { name: "Python" }],
};

describe("calculateStats", () => {
  it("returns raw GitHub numbers, not weighted scores", () => {
    const stats = calculateStats(sample);

    assert.equal(stats.explorer, 2); // số ngôn ngữ
    assert.equal(stats.builder, 10); // repo gốc (không fork)
    assert.equal(stats.openSource, 123); // 100 stars + 20 forks + 3 PR merged
    assert.equal(stats.consistency, 4); // repo active 12 tháng
    assert.equal(stats.debugger, 8); // open issues
  });

  it("returns 0 for an empty profile", () => {
    const stats = calculateStats({});
    assert.deepEqual(stats, {
      consistency: 0,
      explorer: 0,
      builder: 0,
      openSource: 0,
      debugger: 0,
    });
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
