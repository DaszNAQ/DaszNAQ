import { describe, it } from "node:test";
import assert from "node:assert/strict";
import signs from "../data/zodiac.js";
import { renderZodiacCard } from "./card.js";

describe("renderZodiacCard stats", () => {
  it("sizes bars relative to the highest of the three shown stats", () => {
    const svg = renderZodiacCard({
      profile: {
        username: "alice",
        name: "Alice",
        role: "Dev",
        languages: [{ name: "JS" }],
      },
      zodiac: signs[0],
      stats: {
        builder: 200,
        explorer: 100,
        debugger: 50,
        consistency: 1,
        openSource: 1,
      },
    });

    const anim = [
      ...svg.matchAll(/attributeName="width" from="0" to="(\d+)"/g),
    ].map((m) => Number(m[1]));

    assert.deepEqual(anim, [160, 80, 40]);
    assert.match(svg, />200</);
    assert.match(svg, />100</);
    assert.match(svg, />50</);
  });
});
