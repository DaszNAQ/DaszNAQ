/**
 * Per-sign constellations for pinned Gist cards.
 *
 * Built on a character grid, then rendered with ✦ as a *wide* (2-column) glyph
 * so connectors (/ \\ - |) stay visually aligned on GitHub / Windows fonts.
 */

/** Grid cells: '*' = star, other chars drawn as-is (width 1). */
const GRIDS = {
  aries: [
    "   *  ",
    "  / \\ ",
    " *---*",
    "    \\ ",
    "     *",
  ],
  taurus: [
    "     *  ",
    "       \\",
    " *-----*",
    "    \\   ",
    "     *--*",
  ],
  gemini: [
    " *   *",
    " |   |",
    " *---*",
    " |   |",
    " *   *",
  ],
  cancer: [
    "  *--* ",
    " /    \\",
    "*      *",
    " \\    /",
    "  *--* ",
  ],
  leo: [
    "   *  ",
    " *-+-*",
    "   |  ",
    " *-*-*",
    "   *  ",
  ],
  virgo: [
    "*--*--*",
    "   |   ",
    "   *--*",
    "      |",
    "      *",
  ],
  libra: [
    "   *  ",
    "  / \\ ",
    "*-*-*-*",
    "  \\ / ",
    "   *  ",
  ],
  scorpio: [
    "*--*--* ",
    "       \\",
    "        *",
    "       / ",
    "   *-*-* ",
  ],
  sagittarius: [
    "      *",
    "     / ",
    " *--*  ",
    "/      ",
    "*---*  ",
  ],
  capricorn: [
    " *---* ",
    "      \\",
    "  *---*",
    " /     ",
    "*--*-* ",
  ],
  aquarius: [
    "*-*- *-*",
    "   \\/  ",
    "*-*- *-*",
    "   \\/  ",
    "    *  ",
  ],
  pisces: [
    "*--*  *--*",
    "   \\  /  ",
    "    **   ",
    "   /  \\  ",
    "*--*  *--*",
  ],
};

function renderGrid(rows) {
  return rows.map((row) => {
    let out = "";
    for (const ch of row) {
      if (ch === "*") out += "✦";
      else out += ch;
    }
    return out;
  });
}

export const ASCII_CONSTELLATIONS = Object.fromEntries(
  Object.entries(GRIDS).map(([id, rows]) => [id, renderGrid(rows)]),
);

export function getAsciiConstellation(signId) {
  return ASCII_CONSTELLATIONS[signId] || ASCII_CONSTELLATIONS.taurus;
}
