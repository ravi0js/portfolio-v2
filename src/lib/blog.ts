/**
 * Blog posts for the Blog section, resolved at build time:
 *   manual posts from blog.json  +  (optionally) the Medium RSS feed
 * merged, de-duplicated by URL, newest first. Feed failures are logged and ignored,
 * so the section always has at least the manual posts and the build never breaks.
 */
import { getCollection } from 'astro:content';
import { blog, type BlogPost } from './content';

const TIMEOUT_MS = 8000;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .trim();

const stripHtml = (html: string) =>
  decode(html)
    .replace(/<figure[\s\S]*?<\/figure>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Canonical URL for de-duplication: no query string or trailing slash. */
const key = (url: string) => url.split('?')[0].replace(/\/$/, '').toLowerCase();

const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];

async function fetchMedium(username: string): Promise<BlogPost[]> {
  try {
    const res = await fetch(`https://medium.com/feed/@${username}`, {
      headers: { 'User-Agent': 'portfolio-build', Accept: 'application/rss+xml, text/xml' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[blog] Medium feed → HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item]) => {
      const title = tag(item, 'title');
      const link = tag(item, 'link');
      const pub = tag(item, 'pubDate');
      if (!title || !link || !pub) return [];
      const body = stripHtml(tag(item, 'content:encoded') ?? '');
      const excerpt = body.length > 180 ? `${body.slice(0, 177).replace(/\s+\S*$/, '')}…` : body;
      const tags = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)]
        .map(([, c]) => decode(c).normalize('NFKC').replace(/-/g, ' '))
        .slice(0, 3);
      return [
        {
          title: decode(title),
          url: decode(link).split('?')[0],
          date: new Date(pub).toISOString().slice(0, 10),
          excerpt,
          tags,
          source: 'Medium',
        },
      ];
    });
  } catch (e) {
    console.warn(`[blog] Medium feed → ${(e as Error).message}`);
    return [];
  }
}

let cached: Promise<BlogPost[]> | undefined;

export function getBlogPosts(): Promise<BlogPost[]> {
  return (cached ??= (async () => {
    const feed = blog.medium.fetch ? await fetchMedium(blog.medium.username) : [];
    // Articles written for this site (drafts only show in dev).
    const articles: BlogPost[] = (await getCollection('articles', (a) => import.meta.env.DEV || !a.data.draft)).map(
      (a) => ({
        title: a.data.title,
        url: `/blog/${a.id}/`,
        date: a.data.date.toISOString().slice(0, 10),
        excerpt: a.data.description,
        tags: a.data.tags,
        source: a.data.draft ? 'Article (draft)' : 'Article',
      }),
    );
    const byUrl = new Map<string, BlogPost>();
    // Manual entries win (you can override a feed post's title, excerpt or tags in blog.json).
    for (const p of [...feed, ...blog.posts, ...articles]) byUrl.set(key(p.url), { ...byUrl.get(key(p.url)), ...p });
    return [...byUrl.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, blog.max);
  })());
}
