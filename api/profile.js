import { fetchGitHubProfile } from "../src/lib/github.js";
import { resolveZodiac } from "../src/lib/zodiac.js";

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const username = (url.searchParams.get("username") || "").trim();
    const birthdate = url.searchParams.get("birthdate") || undefined;
    const sign = url.searchParams.get("sign") || undefined;

    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      return res.status(400).json({ error: "Invalid GitHub username" });
    }

    const profile = await fetchGitHubProfile(username);
    const { zodiac, source } = resolveZodiac({
      username: profile.username,
      birthdate,
      sign,
    });

    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
    return res.status(200).json({
      username: profile.username,
      name: profile.name,
      role: profile.role,
      languages: (profile.languages || []).slice(0, 5).map((l) => l.name),
      zodiac: {
        id: zodiac.id,
        sign: zodiac.sign,
        symbol: zodiac.symbol,
        title: zodiac.title,
      },
      source,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || "Unexpected error" });
  }
}
