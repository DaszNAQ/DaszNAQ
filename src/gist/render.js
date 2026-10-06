import { pickDisplayStats, relativeFill, formatStatValue } from "../lib/stats.js";
import { getAsciiConstellation } from "./constellations.js";

const LEFT_WIDTH = 36;
const BAR_WIDTH = 12;

function codeWidth(code) {
  if (!code) return 0;
  // combining marks / variation selectors
  if (code >= 0xfe00 && code <= 0xfe0f) return 0;
  if (code >= 0x0300 && code <= 0x036f) return 0;
  // emoji & pictographs (⭐ 📦 👥 etc.)
  if (code >= 0x1f300 && code <= 0x1faff) return 2;
  if (code >= 0x1f000 && code <= 0x1f02f) return 2;
  // misc symbols / dingbats often render wide in gist
  if (code >= 0x2600 && code <= 0x27bf) return 2;
  // zodiac ♈–♓ — treat wide so padding stays stable on GitHub
  if (code >= 0x2648 && code <= 0x2653) return 2;
  // CJK / Hangul
  if (code >= 0x1100 && code <= 0x115f) return 2;
  if (code >= 0x2e80 && code <= 0xa4cf) return 2;
  if (code >= 0xac00 && code <= 0xd7a3) return 2;
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  if (code >= 0xff00 && code <= 0xff60) return 2;
  return 1;
}

function displayWidth(str) {
  let w = 0;
  for (const ch of String(str ?? "")) {
    w += codeWidth(ch.codePointAt(0));
  }
  return w;
}

function clipPad(str, width) {
  let out = "";
  let w = 0;
  for (const ch of String(str ?? "")) {
    const cw = codeWidth(ch.codePointAt(0));
    if (w + cw > width) break;
    out += ch;
    w += cw;
  }
  return out + " ".repeat(Math.max(0, width - w));
}

/** 0–999 as-is; 1000+ as k (e.g. 1200 → 1.2k, 10000 → 10k). Fixed width for pin alignment. */
function compactStat(n, width = 4) {
  return formatStatValue(n).padStart(width, " ");
}

function bar(value, peak, width = BAR_WIDTH) {
  const filled = relativeFill(value, peak, width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function mergePinRows(leftLines, rightLines) {
  const rows = Math.max(leftLines.length, rightLines.length, 5);
  const out = [];
  for (let i = 0; i < rows; i++) {
    const left = clipPad(leftLines[i] || "", LEFT_WIDTH);
    const right = rightLines[i] || "";
    out.push(right ? `${left}  ${right}` : left.trimEnd());
  }
  return out;
}

const ROLE_ABBR = {
  "full-stack developer": "Full-Stack Dev",
  "fullstack developer": "Full-Stack Dev",
  "backend developer": "Backend Dev",
  "frontend developer": "Frontend Dev",
  "systems developer": "Systems Dev",
  "mobile developer": "Mobile Dev",
  "software engineer": "Software Eng",
  "software developer": "Software Dev",
  "web developer": "Web Dev",
  "app developer": "App Dev",
  "devops engineer": "DevOps",
};

/** Prefer real abbreviations over mid-word clipping ("Full-Stack Develo"). */
function abbreviateRole(role) {
  const raw = String(role || "Software Dev").trim();
  const mapped = ROLE_ABBR[raw.toLowerCase()];
  if (mapped) return mapped;
  return raw
    .replace(/\bFull[-\s]?Stack\b/gi, "Full-Stack")
    .replace(/\bDeveloper\b/gi, "Dev")
    .replace(/\bEngineer\b/gi, "Eng");
}

function abbreviateTitle(title) {
  // Drop leading "The " so pin titles fit: "The Builder" → "Builder"
  return String(title || "").replace(/^The\s+/i, "");
}

/**
 * Pin-first card: colorful left column + stable ASCII constellation on the right.
 * Display-width padding keeps the star map from drifting when stats change.
 * Languages stay below the pin fold (full names) — not squeezed into 5 lines.
 */
function secondaryDisplayName(profile) {
  const login = String(profile.username || "").trim();
  const name = String(profile.name || "").trim();
  if (!name || !login) return name && name !== login ? name : "";
  if (name.toLowerCase() === login.toLowerCase()) return "";
  return name;
}

export function renderGistCard({ profile, zodiac, stats }) {
  const displayStats = pickDisplayStats(stats, zodiac, 3);
  const peak = Math.max(0, ...displayStats.map((s) => Number(s.value) || 0));
  const login = profile.username || profile.name || "developer";
  const realName = secondaryDisplayName(profile);
  const role = abbreviateRole(profile.role || "Software Dev");
  const title = abbreviateTitle(zodiac.title);
  const langs = (profile.languages || [])
    .slice(0, 3)
    .map((l) => l.name)
    .join(" · ");
  const identity = realName
    ? `✨ ${login} · ${realName}`
    : `✨ ${login} · ${role}`;

  const constellation = getAsciiConstellation(zodiac.id);

  const pinLeft = [
    `${zodiac.symbol} ${zodiac.sign.toUpperCase()} · ${title}`,
    identity,
    `⭐${compactStat(profile.stars)}  📦${compactStat(profile.publicRepos)}  👥${compactStat(profile.followers)}`,
    `${displayStats[0].label.slice(0, 11).padEnd(11)} ${bar(displayStats[0].value, peak)} ${compactStat(displayStats[0].value)}`,
    `${displayStats[1].label.slice(0, 11).padEnd(11)} ${bar(displayStats[1].value, peak)} ${compactStat(displayStats[1].value)}`,
  ];

  const lines = [...mergePinRows(pinLeft, constellation)];

  lines.push("────────────────────────────────────");
  lines.push(`${zodiac.symbol} ${zodiac.element} · ${zodiac.planet}`);
  if (langs) lines.push(langs);
  if (displayStats[2]) {
    lines.push(
      `${displayStats[2].label.slice(0, 11).padEnd(11)} ${bar(displayStats[2].value, peak)} ${compactStat(displayStats[2].value)}`,
    );
  }
  if (zodiac.description) {
    lines.push("");
    lines.push(`💫 ${zodiac.description}`);
  }
  lines.push("");
  lines.push("✦ Your coding personality written in the stars");

  return lines.join("\n");
}

export function gistFilename(zodiac) {
  return `${zodiac.symbol} ${zodiac.sign}.md`;
}

// exported for light testing
export { displayWidth, clipPad };
