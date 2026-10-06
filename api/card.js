import { pickDisplayStats, relativeFill, formatStatValue } from "../lib/stats.js";
import { seededRandom } from "../lib/zodiac.js";
import signIcons from "../data/sign-icons.js";
import signIconsLine from "../data/sign-icons-line.js";
import constellationIcons from "../data/constellation-icons.js";
import { EMBEDDED_FONT_CSS } from "../data/embedded-fonts.js";
import signature from "../data/signature.js";

/** Design coordinate space (viewBox). Display size can be smaller via options. */
const WIDTH = 600;
const HEIGHT = 320;
/** Default on-page size — compact README card (override with ?width=). */
const DEFAULT_DISPLAY_WIDTH = 360;

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function barWidth(value, peak, max = 160) {
  return relativeFill(value, peak, max);
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function wrapText(text, maxChars, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function mixTowardBlack(hex, amount) {
  const n = String(hex || "").replace("#", "");
  if (n.length !== 6) return hex;
  const t = clamp(amount, 0, 1);
  const mix = (ch) => Math.round(parseInt(ch, 16) * (1 - t));
  const r = mix(n.slice(0, 2));
  const g = mix(n.slice(2, 4));
  const b = mix(n.slice(4, 6));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Dark blue theme: overrides the per-sign palette so every card is navy. */
const DARK_BLUE_THEME = {
  bg0: "#040b1f", // nền gradient - đầu
  bg1: "#0b1e55", // nền gradient - cuối
  accent: "#38bdf8", // tiêu đề, icon, chòm sao, glow
  text: "#e0f2fe", // chữ chính
  muted: "#93b4e0", // chữ phụ
  bar: "#3b82f6", // thanh stat
  star: "#bfdbfe", // các ngôi sao
};

function applyDarkBlueTheme(colors) {
  return { ...colors, ...DARK_BLUE_THEME };
}

/** 4-point needle sparkle centered at (x, y). */
function needleStarPath(x, y, len) {
  const thick = Math.max(0.12, len * 0.11);
  const xf = x.toFixed(1);
  const yf = y.toFixed(1);
  return `M${xf},${(y - len).toFixed(1)} L${(x + thick).toFixed(1)},${yf} L${xf},${(y + len).toFixed(1)} L${(x - thick).toFixed(1)},${yf} Z M${(x - len).toFixed(1)},${yf} L${xf},${(y - thick).toFixed(1)} L${(x + len).toFixed(1)},${yf} L${xf},${(y + thick).toFixed(1)} Z`;
}

function renderStars(seed, color, count = 48) {
  const rand = seededRandom(`stars-${seed}`);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT;
    const len = 1.1 + rand() * 2.4;
    const rot = (rand() * 360).toFixed(1);
    const base = 0.25 + rand() * 0.55;
    const peak = Math.min(1, base + 0.25 + rand() * 0.3);
    const dur = (1.8 + rand() * 3.2).toFixed(2);
    const begin = (rand() * 4).toFixed(2);
    parts.push(
      `<path d="${needleStarPath(x, y, len)}" fill="${color}" opacity="${base.toFixed(2)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})">
        <animate attributeName="opacity" values="${base.toFixed(2)};${peak.toFixed(2)};${(base * 0.55).toFixed(2)};${base.toFixed(2)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
      </path>`,
    );
  }
  return parts.join("");
}

/**
 * Occasional shooting stars — deep background only (under stars + UI).
 * Soft, short sky-band streaks so they don't compete with text.
 */
function renderShootingStars(seed, color, uid) {
  const rand = seededRandom(`meteors-${seed}`);
  const count = 2;
  const parts = [
    `<defs>
      <linearGradient id="${uid}-meteor-core" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
        <stop offset="40%" stop-color="${color}" stop-opacity="0.12"/>
        <stop offset="80%" stop-color="#e0f2fe" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.7"/>
      </linearGradient>
      <linearGradient id="${uid}-meteor-soft" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
        <stop offset="60%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3"/>
      </linearGradient>
      <filter id="${uid}-meteor-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="1.2" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>`,
  ];
  for (let i = 0; i < count; i++) {
    // Soft background streak; path may cross the full card height.
    const x0 = 260 + rand() * 300;
    const y0 = -16 - rand() * 18;
    const x1 = x0 - (180 + rand() * 160);
    const y1 = y0 + (180 + rand() * 120);
    const trail = 64 + rand() * 36;
    const softW = 2.4 + rand() * 1.0;
    const coreW = 0.8 + rand() * 0.35;
    const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    const cycle = (10 + rand() * 5).toFixed(1);
    const begin = (1.2 + rand() * 6).toFixed(1);
    const tEnd = 0.08;
    const t = (-trail).toFixed(1);
    // Peak opacity kept low so UI always wins visually.
    parts.push(`
    <g opacity="0">
      <g transform="translate(${x0.toFixed(1)},${y0.toFixed(1)}) rotate(${angle.toFixed(1)})">
        <path d="M0,0 L${t},${(-softW).toFixed(1)} L${t},${softW.toFixed(1)} Z" fill="url(#${uid}-meteor-soft)"/>
        <path d="M0,0 L${t},${(-coreW).toFixed(1)} L${t},${coreW.toFixed(1)} Z" fill="url(#${uid}-meteor-core)"/>
        <circle cx="0" cy="0" r="1.6" fill="#ffffff" opacity="0.75" filter="url(#${uid}-meteor-glow)"/>
        <circle cx="0" cy="0" r="0.8" fill="#ffffff" opacity="0.85"/>
      </g>
      <animate attributeName="opacity" values="0;0.42;0.42;0;0" keyTimes="0;0.01;${tEnd};${(tEnd + 0.025).toFixed(3)};1" dur="${cycle}s" begin="${begin}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="translate" values="0 0; ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}; ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}" keyTimes="0;${tEnd};1" dur="${cycle}s" begin="${begin}s" calcMode="spline" keySplines="0.15 0.05 0.35 1;0 0 1 1" repeatCount="indefinite"/>
    </g>`);
  }
  return parts.join("");
}

/** Constellation art (name + stars) in the top-right, accent-masked. */
function renderConstellation(zodiac, colors, uid) {
  const icon = constellationIcons[zodiac.id];
  if (!icon) return "";
  const w = 248;
  const h = 132;
  const x = 330;
  const y = 8;
  return `
    <mask id="${uid}-const" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">
      <image href="${icon}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>
    </mask>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.accent}" opacity="0.88" mask="url(#${uid}-const)">
      <animate attributeName="opacity" values="0.55;1;0.68;0.92;0.55" keyTimes="0;0.3;0.55;0.8;1" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1" dur="7s" begin="0.2s" repeatCount="indefinite"/>
    </rect>`;
}

function renderStatBars(displayStats, colors) {
  const peak = Math.max(0, ...displayStats.map((s) => Number(s.value) || 0));
  return displayStats
    .map((stat, i) => {
      const y = 200 + i * 26;
      const w = barWidth(stat.value, peak);
      return `
      <text x="36" y="${y}" fill="${colors.muted}" font-size="12" font-family="Georgia, 'Times New Roman', serif">${escapeXml(stat.label)}</text>
      <rect x="150" y="${y - 10}" width="160" height="8" rx="2" fill="${colors.text}" opacity="0.08"/>
      <rect x="150" y="${y - 10}" width="${w}" height="8" rx="2" fill="${colors.bar}">
        <animate attributeName="width" from="0" to="${w}" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.22 1 0.36 1"/>
      </rect>
      <text x="320" y="${y}" fill="${colors.text}" font-size="12" font-family="Georgia, 'Times New Roman', serif" opacity="0.85">${escapeXml(formatStatValue(stat.value))}</text>`;
    })
    .join("");
}

function renderLanguages(languages, colors) {
  const top = (languages || []).slice(0, 3).map((l) => l.name);
  if (!top.length) return "";
  const label = top.join("   ·   ");
  return `<text x="36" y="168" fill="${colors.accent}" font-size="13" font-family="Georgia, 'Times New Roman', serif" letter-spacing="0.5">${escapeXml(label)}</text>`;
}

function renderDescription(zodiac, colors) {
  const lines = wrapText(zodiac.description, 34, 3);
  if (!lines.length) return "";
  return lines
    .map((line, i) => {
      const prefix = i === 0 ? "💫 " : "   ";
      const y = 148 + i * 17;
      return `<text class="body" x="340" y="${y}" fill="${colors.muted}" font-size="12">${prefix}${escapeXml(line)}</text>`;
    })
    .join("\n    ");
}

/** Line-art illustration under the blurb (right column), tinted to accent. */
function renderLineArt(zodiac, colors, uid) {
  const icon = signIconsLine[zodiac.id];
  if (!icon) return "";
  const size = 88;
  const x = 400;
  const y = 208;
  return `
    <mask id="${uid}-line" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${size}" height="${size}">
      <image href="${icon}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
    </mask>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${colors.accent}" opacity="0.9" mask="url(#${uid}-line)">
      <animate attributeName="opacity" values="0.68;1;0.78;0.94;0.68" keyTimes="0;0.35;0.55;0.8;1" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1" dur="6.5s" begin="0.4s" repeatCount="indefinite"/>
    </rect>`;
}

/** Sign icon from assets/signs — tinted to accent via mask; falls back to emoji. */
function renderSignTitle(zodiac, colors, uid) {
  const icon = signIcons[zodiac.id];
  const label = escapeXml(zodiac.sign.toUpperCase());
  if (!icon) {
    return `<text class="title" x="36" y="48" fill="${colors.accent}" font-size="22" font-weight="700" letter-spacing="3">
      ${escapeXml(zodiac.symbol)}  ${label}
    </text>`;
  }
  const size = 26;
  const x = 36;
  const y = 24;
  return `
    <mask id="${uid}-sign" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${size}" height="${size}">
      <image href="${icon}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
    </mask>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${colors.accent}" mask="url(#${uid}-sign)"/>
    <text class="title" x="${x + size + 10}" y="48" fill="${colors.accent}" font-size="22" font-weight="700" letter-spacing="3">${label}</text>`;
}

/** Chữ ký góc dưới bên phải — PNG trắng/trong suốt dùng làm mask, tô màu theo theme. */
function renderSignature(colors, uid) {
  const w = 84;
  const h = Math.round((w / 2.852) * 10) / 10; // tỉ lệ ảnh chữ ký 154x54
  const x = 480;
  const y = 270;
  return `
    <mask id="${uid}-sig" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}">
      <image href="${signature}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>
    </mask>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.text}" opacity="0.88" mask="url(#${uid}-sig)"/>`;
}

function secondaryDisplayName(profile) {
  const login = String(profile.username || "").trim();
  const name = String(profile.name || "").trim();
  if (!name || !login) return name && name !== login ? name : "";
  if (name.toLowerCase() === login.toLowerCase()) return "";
  return name;
}

/**
 * @param {{ profile: object, zodiac: object, stats: object, meta?: { source?: string, width?: number } }} input
 */
export function renderZodiacCard({ profile, zodiac, stats, meta = {} }) {
  const colors = applyDarkBlueTheme(zodiac.colors);
  const displayStats = pickDisplayStats(stats, zodiac, 3);
  const login = profile.username || profile.name || "developer";
  const realName = secondaryDisplayName(profile);
  const role = profile.role || "Software Developer";
  const uid = `zg-${profile.username}-${zodiac.id}`.replace(/[^a-z0-9-]/gi, "");
  const nameLabel = realName ? `${login} (${realName})` : login;
  const nameLine = realName
    ? `${escapeXml(login)}<tspan fill="${colors.muted}" font-size="14" font-weight="400">  ${escapeXml(realName)}</tspan>`
    : escapeXml(login);

  const displayWidth = clamp(
    Number(meta.width) || DEFAULT_DISPLAY_WIDTH,
    240,
    900,
  );
  const displayHeight = Math.round((displayWidth / WIDTH) * HEIGHT);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(nameLabel)} Developer Zodiac Card">
  <title>${escapeXml(nameLabel)} — ${escapeXml(zodiac.sign)} ${escapeXml(zodiac.title)}</title>
  <defs>
    <linearGradient id="${uid}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors.bg0}"/>
      <stop offset="100%" stop-color="${colors.bg1}"/>
    </linearGradient>
    <radialGradient id="${uid}-glow" cx="72%" cy="28%" r="45%">
      <stop offset="0%" stop-color="${colors.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${colors.bg0}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${uid}-clip">
      <rect width="${WIDTH}" height="${HEIGHT}" rx="16"/>
    </clipPath>
    <style>
${EMBEDDED_FONT_CSS}
      .title { font-family: Cinzel, Georgia, serif; }
      .body { font-family: 'Source Serif 4', Georgia, serif; }
    </style>
  </defs>

  <g clip-path="url(#${uid}-clip)">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${uid}-bg)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${uid}-glow)"/>
    ${renderShootingStars(`${profile.username}-${zodiac.id}`, colors.star, uid)}
    ${renderStars(`${profile.username}-${zodiac.id}`, colors.star)}

    ${renderConstellation(zodiac, colors, uid)}

    ${renderSignTitle(zodiac, colors, uid)}
    <text class="title" x="36" y="76" fill="${colors.text}" font-size="18" opacity="0.95">
      ${escapeXml(zodiac.title)}
    </text>

    <text class="body" x="36" y="114" fill="${colors.text}" font-size="22" font-weight="600">
      ${nameLine}
    </text>
    <text class="body" x="36" y="136" fill="${colors.muted}" font-size="13">
      ${escapeXml(role)}
    </text>

    ${renderLanguages(profile.languages, colors)}
    ${renderDescription(zodiac, colors)}
    ${renderLineArt(zodiac, colors, uid)}
    ${renderStatBars(displayStats, colors)}

    <text class="body" x="36" y="298" fill="${colors.accent}" font-size="12" opacity="0.9">
      ✦ Aim far. Explore more. Build something new.
    </text>
    ${renderSignature(colors, uid)}
  </g>
</svg>`;
}

export const CARD_SIZE = {
  width: WIDTH,
  height: HEIGHT,
  defaultDisplayWidth: DEFAULT_DISPLAY_WIDTH,
};