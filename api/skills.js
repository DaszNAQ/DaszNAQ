const SKILLICONS = "https://skillicons.dev/icons?i=";
const GO_SKILLICONS = "https://go-skill-icons.vercel.app/api/icons?i=";

const GROUPS = [
  {
    title: "Languages",
    col: 0,
    slot: 0,
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
    col: 0,
    slot: 1,
    items: [
      ["figma", "Figma"],
      ["notion", "Notion"],
      ["trello", "Trello"],
    ],
  },
  {
    title: "Frameworks",
    col: 1,
    slot: 0,
    items: [
      ["react", "React"],
      ["nodejs", "Node.js"],
      ["unity", "Unity"],
    ],
  },
  {
    title: "AI",
    col: 1,
    slot: 1,
    source: "go",
    items: [
      ["claude", "Claude"],
      ["gemini", "Gemini"],
      ["grok", "Grok"],
      ["chatgpt", "ChatGPT"],
    ],
  },
];

const CUSTOM_ICONS = {
  trello: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <rect width="48" height="48" rx="8" fill="#161b22"/>
    <rect x="9" y="9" width="30" height="30" rx="5" fill="#0079bf"/>
    <rect x="14" y="14" width="8" height="18" rx="2" fill="#ffffff"/>
    <rect x="26" y="14" width="8" height="11" rx="2" fill="#ffffff"/>
  </svg>`,
};

const WIDTH = 420;
const HEIGHT = 224; 
const CELL_W = WIDTH / 2;
const ICON = 20;
const ROW_H = 26;
const ITEM_X = [14, 112];
const TITLE_Y = [20, 128]; 
const ITEMS_Y = [28, 136]; 

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDataUri(svgText) {
  return `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`;
}

async function fetchIcon(source, id) {
  if (CUSTOM_ICONS[id]) return toDataUri(CUSTOM_ICONS[id]);
  const base = source === "go" ? GO_SKILLICONS : SKILLICONS;
  const res = await fetch(`${base}${encodeURIComponent(id)}&theme=dark`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`icon ${id}: HTTP ${res.status}`);
  const text = await res.text();
  // Ảnh rỗng (icon không tồn tại) thường rất ngắn -> coi như lỗi
  if (!text.includes("<svg") || text.length < 400) {
    throw new Error(`icon ${id}: empty or not svg`);
  }
  return toDataUri(text);
}

function placeholder(x, y, label) {
  const letter = escapeXml(String(label).charAt(0).toUpperCase());
  return `<rect x="${x}" y="${y}" width="${ICON}" height="${ICON}" rx="5" fill="#1e3a8a"/>
    <text x="${x + ICON / 2}" y="${y + 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#e0f2fe">${letter}</text>`;
}

async function renderSvg() {
  // Tải icon song song; icon nào lỗi thì dùng ô chữ cái thay thế
  const jobs = GROUPS.flatMap((g) =>
    g.items.map(([id]) =>
      fetchIcon(g.source, id).then(
        (uri) => [id, uri],
        () => [id, null],
      ),
    ),
  );
  const icons = Object.fromEntries(await Promise.all(jobs));

  const parts = [];

  for (const group of GROUPS) {
    const gx = group.col * CELL_W;

    // Tiêu đề căn giữa trong ô của nhóm
    parts.push(
      `<text class="t h" x="${gx + CELL_W / 2}" y="${TITLE_Y[group.slot]}" text-anchor="middle">${escapeXml(group.title)}</text>`,
    );

    group.items.forEach(([id, name], i) => {
      const x = gx + ITEM_X[i % 2];
      const y = ITEMS_Y[group.slot] + Math.floor(i / 2) * ROW_H;
      const uri = icons[id];
      parts.push(
        uri
          ? `<image href="${uri}" x="${x}" y="${y}" width="${ICON}" height="${ICON}"/>`
          : placeholder(x, y, name),
      );
      parts.push(
        `<text class="t n" x="${x + ICON + 7}" y="${y + 14}">${escapeXml(name)}</text>`,
      );
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Languages, tools, frameworks and AI">
  <style>
    .t { font-family: Arial, Helvetica, sans-serif; fill: #1f2937; }
    .h { font-size: 13px; font-weight: 700; }
    .n { font-size: 11px; }
    .d { stroke: #d0d7de; }
    @media (prefers-color-scheme: dark) {
      .t { fill: #e0f2fe; }
      .d { stroke: #30363d; }
    }
  </style>
  ${parts.join("\n  ")}
  <line class="d" x1="${WIDTH - 1}" y1="8" x2="${WIDTH - 1}" y2="${HEIGHT - 8}" stroke-width="1"/>
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