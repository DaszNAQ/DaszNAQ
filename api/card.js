import { fetchGitHubProfile } from "../src/lib/github.js";
import { resolveZodiac } from "../src/lib/zodiac.js";
import { calculateStats } from "../src/lib/stats.js";
import { renderZodiacCard } from "../src/render/card.js";

function sendSvg(res, svg, cacheSeconds = 14400) {
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
  );
  res.status(200).send(svg);
}

function sendErrorSvg(res, status, message) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="300" rx="16" fill="#0a1a3f"/>
  <rect x="1" y="1" width="598" height="298" rx="15" fill="none" stroke="#1e3a8a" stroke-width="2"/>
  <text x="40" y="140" fill="#7dd3fc" font-size="20" font-family="Georgia, serif">Zodiac card error</text>
  <text x="40" y="175" fill="#bfdbfe" font-size="14" font-family="Georgia, serif">${message}</text>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(svg);
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const username = (url.searchParams.get("username") || "")
      .trim()
      .replace(/\.svg$/i, "");
    const birthdate = url.searchParams.get("birthdate") || undefined;
    const sign = url.searchParams.get("sign") || undefined;
    const role = sanitizeText(url.searchParams.get("role"), 40);
    const name = sanitizeText(url.searchParams.get("name"), 32);
    const width = parseWidth(url.searchParams.get("width"));

    if (!username) {
      return sendErrorSvg(res, 400, "Missing ?username= parameter");
    }
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return sendErrorSvg(res, 400, "Invalid GitHub username");
    }

    const profile = await fetchGitHubProfile(username);
    if (role) profile.role = role;
    if (name) profile.name = name;

    const { zodiac, source } = resolveZodiac({
      username: profile.username,
      birthdate,
      sign,
    });
    // Stats values from GitHub; which 3 bars show comes from the zodiac sign
    const stats = calculateStats(profile);
    const svg = renderZodiacCard({
      profile,
      zodiac,
      stats,
      meta: { source, width },
    });

    return sendSvg(res, svg);
  } catch (err) {
    const status = err.statusCode || 500;
    const message = escapeAttr(err.message || "Unexpected error");
    return sendErrorSvg(res, status, message);
  }
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeText(value, maxLen) {
  if (value == null || value === "") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLen);
}

/** Optional ?width=240..900 (default handled in renderer = 360). */
function parseWidth(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(240, Math.min(900, Math.round(n)));
}