const GITHUB_API = "https://api.github.com";

function headers() {
  const h = {
    Accept: "application/vnd.github+json",
    "User-Agent": "developer-zodiac-card",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function gh(path) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: headers() });
  if (res.status === 404) {
    const err = new Error("GitHub user not found");
    err.statusCode = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
    err.statusCode = res.status === 403 ? 429 : 502;
    throw err;
  }
  return res.json();
}

function guessRole(languages) {
  const top = languages[0]?.name?.toLowerCase() ?? "";
  // Short labels: long "...Developer" strings get clipped
  const map = {
    python: "Backend Dev",
    go: "Backend Dev",
    rust: "Systems Dev",
    java: "Backend Dev",
    kotlin: "Mobile Dev",
    swift: "Mobile Dev",
    typescript: "Full-Stack Dev",
    javascript: "Full-Stack Dev",
    "c#": "Software Eng",
    "c++": "Systems Dev",
    c: "Systems Dev",
    php: "Web Dev",
    ruby: "Web Dev",
    dart: "App Dev",
    html: "Frontend Dev",
    css: "Frontend Dev",
    shell: "DevOps",
    dockerfile: "DevOps",
  };
  return map[top] || "Software Dev";
}

/** Fetch up to 5 pages of 100 repos (enough for most users). */
async function fetchAllOwnedRepos(username) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(
      `/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated&type=owner`,
    );
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Count PRs merged into other people's repos (real open source work).
 * The Search API has its own rate limit; on failure return 0.
 */
async function fetchExternalMergedPRs(username) {
  try {
    const q = encodeURIComponent(
      `author:${username} type:pr is:merged -user:${username}`,
    );
    const data = await gh(`/search/issues?q=${q}&per_page=1`);
    return data.total_count || 0;
  } catch {
    return 0;
  }
}

export async function fetchGitHubProfile(username) {
  const user = await gh(`/users/${encodeURIComponent(username)}`);
  const [repos, mergedPRs] = await Promise.all([
    fetchAllOwnedRepos(username),
    fetchExternalMergedPRs(username),
  ]);

  const languageCount = {};
  let stars = 0;
  let forks = 0;
  let openIssues = 0;
  let originalRepos = 0;
  let activeRepos = 0;
  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

  for (const repo of repos) {
    if (repo.fork) continue;
    originalRepos += 1;
    stars += repo.stargazers_count || 0;
    forks += repo.forks_count || 0;
    openIssues += repo.open_issues_count || 0;
    if (repo.pushed_at && new Date(repo.pushed_at).getTime() >= yearAgo) {
      activeRepos += 1;
    }
    if (repo.language) {
      languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
    }
  }

  const languages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const createdAt = new Date(user.created_at);
  const ageDays = Math.max(
    1,
    Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    username: user.login,
    name: user.name || user.login,
    bio: user.bio || "",
    avatarUrl: user.avatar_url,
    followers: user.followers || 0,
    following: user.following || 0,
    publicRepos: user.public_repos || 0,
    originalRepos,
    activeRepos,
    mergedPRs,
    createdAt: user.created_at,
    joinedYear: createdAt.getUTCFullYear(),
    ageDays,
    stars,
    forks,
    openIssues,
    languages,
    role: guessRole(languages),
    mostActiveRepo: repos.find((r) => !r.fork)?.name || null,
  };
}
