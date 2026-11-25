/**
 * Build-time GitHub data. Runs during `astro build` / `astro dev` only — visitors'
 * browsers never call GitHub. Every request has a timeout and every failure returns
 * null, so a GitHub outage or rate limit never breaks the build: the section falls
 * back to a plain profile link.
 *
 * Optional: set GITHUB_TOKEN (read-only, no scopes needed) to raise the API limit
 * from 60 to 5,000 requests/hour, useful on shared CI/Netlify build machines.
 */
import { site } from './content';

export interface GitHubRepo {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  pushedAt: string;
}

export interface GitHubContributions {
  total: number;
  activeDays: number;
  /** 0–4 intensity per day, oldest first, grouped in weeks (Sunday-first, like GitHub). */
  weeks: { date: string; level: number; count: number }[][];
}

export interface GitHubData {
  username: string;
  name: string | null;
  profileUrl: string;
  avatarUrl: string;
  publicRepos: number;
  memberSince: string;
  lastPush: string | null;
  repos: GitHubRepo[];
  languages: { name: string; count: number }[];
  contributions: GitHubContributions | null;
  fetchedAt: string;
}

const TIMEOUT_MS = 8000;

function headers(accept = 'application/vnd.github+json'): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: accept,
    'User-Agent': 'portfolio-build',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.warn(`[github] ${url} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[github] ${url} → ${(e as Error).message}`);
    return null;
  }
}

/**
 * Contribution calendar from GitHub's public profile fragment. This endpoint is not
 * an official API, so parsing is defensive: anything unexpected returns null.
 */
async function getContributions(username: string): Promise<GitHubContributions | null> {
  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
      headers: { Accept: 'text/html', 'User-Agent': 'portfolio-build' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const cells = [...html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"[^>]*data-level="(\d)"/g)];
    if (cells.length < 300) return null;
    const counts = new Map<string, number>();
    for (const m of html.matchAll(/for="([^"]+)"[^>]*>\s*(No|\d+) contributions? on/g)) {
      counts.set(m[1], m[2] === 'No' ? 0 : Number(m[2]));
    }
    const days = cells
      .map(([, date, id, level]) => ({ date, level: Number(level), count: counts.get(id) ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const weeks: GitHubContributions['weeks'] = [];
    for (const d of days) {
      const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      if (dow === 0 || weeks.length === 0) weeks.push([]);
      weeks[weeks.length - 1].push(d);
    }
    const total = days.reduce((n, d) => n + d.count, 0);
    return { total, activeDays: days.filter((d) => d.count > 0).length, weeks };
  } catch (e) {
    console.warn(`[github] contributions → ${(e as Error).message}`);
    return null;
  }
}

interface ApiUser {
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
  created_at: string;
}
interface ApiRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  size: number;
}

async function load(): Promise<GitHubData | null> {
  const cfg = site.github;
  if (!cfg.enabled) return null;
  const u = cfg.username;
  const [user, repos] = await Promise.all([
    getJson<ApiUser>(`https://api.github.com/users/${u}`),
    getJson<ApiRepo[]>(`https://api.github.com/users/${u}/repos?per_page=100&sort=pushed&type=owner`),
  ]);
  if (!user || !repos) return null;

  const exclude = new Set(cfg.excludeRepos.map((r) => r.toLowerCase()));
  const visible = repos.filter(
    (r) =>
      !exclude.has(r.name.toLowerCase()) &&
      r.name.toLowerCase() !== u.toLowerCase() && // profile README repo
      r.size > 0 && // empty repos
      !r.archived &&
      (cfg.includeForks || !r.fork),
  );

  const langCounts = new Map<string, number>();
  for (const r of visible) if (r.language) langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);

  return {
    username: user.login,
    name: user.name,
    profileUrl: user.html_url,
    avatarUrl: `${user.avatar_url}${user.avatar_url.includes('?') ? '&' : '?'}s=160`,
    publicRepos: visible.length,
    memberSince: user.created_at.slice(0, 7),
    lastPush: visible[0]?.pushed_at ?? null,
    repos: visible.slice(0, cfg.maxRepos).map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    })),
    languages: [...langCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    contributions: cfg.showContributions ? await getContributions(u) : null,
    fetchedAt: new Date().toISOString(),
  };
}

// One fetch per build, shared by every page that asks.
let cached: Promise<GitHubData | null> | undefined;
export function getGitHubData(): Promise<GitHubData | null> {
  return (cached ??= load());
}
