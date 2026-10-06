import signs from "../data/zodiac.js";

const SIGN_ORDER = [
  "capricorn",
  "aquarius",
  "pisces",
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
];

/** Rough tropical date ranges (month/day). Capricorn wraps year end. */
const RANGES = [
  { id: "capricorn", start: [12, 22], end: [1, 19] },
  { id: "aquarius", start: [1, 20], end: [2, 18] },
  { id: "pisces", start: [2, 19], end: [3, 20] },
  { id: "aries", start: [3, 21], end: [4, 19] },
  { id: "taurus", start: [4, 20], end: [5, 20] },
  { id: "gemini", start: [5, 21], end: [6, 20] },
  { id: "cancer", start: [6, 21], end: [7, 22] },
  { id: "leo", start: [7, 23], end: [8, 22] },
  { id: "virgo", start: [8, 23], end: [9, 22] },
  { id: "libra", start: [9, 23], end: [10, 22] },
  { id: "scorpio", start: [10, 23], end: [11, 21] },
  { id: "sagittarius", start: [11, 22], end: [12, 21] },
];

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function inRange(month, day, start, end) {
  const value = month * 100 + day;
  const s = start[0] * 100 + start[1];
  const e = end[0] * 100 + end[1];
  if (s <= e) return value >= s && value <= e;
  return value >= s || value <= e;
}

export function getAllSigns() {
  return signs;
}

export function getSignById(id) {
  return signs.find((s) => s.id === id) ?? null;
}

export function signFromBirthdate(birthdate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const range = RANGES.find((r) => inRange(month, day, r.start, r.end));
  return range ? getSignById(range.id) : null;
}

/** Deterministic “star map” when birthdate is omitted. */
export function signFromUsername(username) {
  const idx = hashString(username.toLowerCase()) % SIGN_ORDER.length;
  return getSignById(SIGN_ORDER[idx]);
}

export function resolveZodiac({ username, birthdate, sign } = {}) {
  if (sign) {
    const forced = getSignById(String(sign).toLowerCase());
    if (forced) return { zodiac: forced, source: "param" };
  }
  const fromBirth = signFromBirthdate(birthdate);
  if (fromBirth) return { zodiac: fromBirth, source: "birthdate" };
  return { zodiac: signFromUsername(username || "guest"), source: "username" };
}

export function seededRandom(seed) {
  let state = hashString(String(seed)) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
