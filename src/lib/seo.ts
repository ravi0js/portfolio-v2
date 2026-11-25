import { site, profile, experience, skills } from './content';

/** schema.org Person, generated from the same JSON as the page. */
export function personJsonLd() {
  const current = experience.find((e) => e.end === null);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    url: site.seo.url,
    email: `mailto:${profile.email}`,
    address: { '@type': 'PostalAddress', addressLocality: profile.location },
    ...(current && { worksFor: { '@type': 'Organization', name: current.company } }),
    sameAs: profile.links.map((l) => l.url),
    knowsAbout: skills.flatMap((g) => g.items.map((i) => i.name)).slice(0, 25),
  };
}

export function absoluteUrl(path: string): string {
  return new URL(path, site.seo.url).toString();
}
