/**
 * api/skills.js
 * Trả về 1 ảnh SVG gồm: icon + tên (font Arial) theo từng nhóm,
 * kèm đường kẻ dọc ở mép phải để phân cách với thẻ Zodiac.
 *
 * Dùng: https://zoodiac-card.vercel.app/api/skills
 */

const SKILLICONS = "https://skillicons.dev/icons?i=";
const GO_SKILLICONS = "https://go-skill-icons.vercel.app/api/icons?i=";

// ===== SỬA DANH SÁCH Ở ĐÂY =====
// [mã icon, tên hiển thị]. source "go" = dùng go-skill-icons (cho icon AI)
const GROUPS = [
  {
    title: "Languages",
    items: [
      ["html", "HTML"],
      ["css", "CSS"],
      ["js", "JavaScript"],
      ["cs", "C#"],
      ["cpp", "C++"],
    ],
  },
  {
    title: "Tools",
    items: [
      ["figma", "Figma"],
      ["notion", "Notion"],
      ["trello", "Trello"],
    ],
  },
  {
    title: "Frameworks",
    items: [
      ["react", "React"],
      ["nodejs", "Node.js"],
      ["unity", "Unity"],
    ],
  },
  {
    title: "AI",
    source: "go",
    items: [
      ["claude", "Claude"],
      ["gemini", "Gemini"],
      ["grok", "Grok"],
      ["chatgpt", "ChatGPT"],
    ],
  },
];
// ================================

const WIDTH = 340;
const COLS = 2;
const COL_X = [20, 180];
const ICON = 28;
const ROW_H = 40;
const TITLE_H = 34;
const GROUP_GAP = 14;
const TOP = 12;

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchIcon(source, id) {
  const base = source === "go" ? GO_SKILLICONS : SKILLICONS;
  const res = await fetch(`${base}${encodeURIComponent(id)}&theme=dark`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`icon ${id}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("<svg")) throw new Error(`icon ${id}: not svg`);
  return `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
}

function placeholder(x, y, label) {
  const letter = escapeXml(String(label).charAt(0).toUpperCase());
  return `<rect x="${x}" y="${y}" width="${ICON}" height="${ICON}" rx="6" fill="#1e3a8a"/>
    <text x="${x + ICON / 2}" y="${y + 19}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#e0f2fe">${letter}</text>`;
}

async function renderSvg() {
  // Tải tất cả icon song song; icon nào lỗi thì dùng ô chữ cái thay thế
  const jobs = GROUPS.flatMap((g) =>
    g.items.map(([id]) =>
      fetchIcon(g.source, id).then(
        (uri) => [id, uri],
        () => [id, null],
      ),
    ),
  );
  const icons = Object.fromEntries(await Promise.all(jobs));

  let y = TOP;
  const parts = [];

  for (const group of GROUPS) {
    parts.push(
      `<text class="t h" x="${COL_X[0]}" y="${y + 18}">${escapeXml(group.title)}</text>`,
    );
    y += TITLE_H;

    group.items.forEach(([id, name], i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = COL_X[col];
      const iy = y + row * ROW_H;
      const uri = icons[id];
      parts.push(
        uri
          ? `<image href="${uri}" x="${x}" y="${iy}" width="${ICON}" height="${ICON}"/>`
          : placeholder(x, iy, name),
      );
      parts.push(
        `<text class="t n" x="${x + ICON + 10}" y="${iy + 19}">${escapeXml(name)}</text>`,
      );
    });

    y += Math.ceil(group.items.length / COLS) * ROW_H + GROUP_GAP;
  }

  const height = y;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Languages, tools, frameworks and AI">
  <style>
    .t { font-family: Arial, Helvetica, sans-serif; fill: #1f2937; }
    .h { font-size: 16px; font-weight: 700; }
    .n { font-size: 14px; }
    .d { stroke: #d0d7de; }
    @media (prefers-color-scheme: dark) {
      .t { fill: #e0f2fe; }
      .d { stroke: #30363d; }
    }
  </style>
  ${parts.join("\n  ")}
  <line class="d" x1="${WIDTH - 1}" y1="8" x2="${WIDTH - 1}" y2="${height - 8}" stroke-width="1"/>
</svg>`;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const svg = await renderSvg();
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return res.status(200).send(svg);
  } catch (err) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).send(String(err.message || "Unexpected error"));
  }
}
