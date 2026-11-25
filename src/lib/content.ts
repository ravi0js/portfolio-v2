/**
 * Single source of truth: every piece of site content comes from src/data/*.json
 * and is validated here at build time. A typo or missing field fails the build
 * with a readable message instead of rendering a broken page.
 */
import { z } from 'astro/zod';

import siteJson from '@/data/site.json';
import profileJson from '@/data/profile.json';
import metricsJson from '@/data/metrics.json';
import experienceJson from '@/data/experience.json';
import systemsJson from '@/data/systems.json';
import projectsJson from '@/data/projects.json';
import skillsJson from '@/data/skills.json';
import educationJson from '@/data/education.json';
import aboutJson from '@/data/about.json';

import { iconPaths, type IconName } from '@/components/ui/icons';

const iconName = z.enum(Object.keys(iconPaths) as [IconName, ...IconName[]]);
const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex colour like #34d399');
const url = z.string().min(1);
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

const palette = z.object({
  bg: hex,
  surface: hex,
  surfaceRaised: hex,
  border: hex,
  text: hex,
  muted: hex,
  subtle: hex,
  /** Optional per-mode accent override (e.g. a darker shade for light backgrounds). */
  accent: hex.optional(),
  accentContrast: hex.optional(),
});

const sectionMeta = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
});

export const siteSchema = z.object({
  seo: z.object({
    url: url,
    title: z.string(),
    titleTemplate: z.string().includes('%s'),
    description: z.string().max(170),
    ogImage: z.string(),
    locale: z.string(),
    keywords: z.array(z.string()),
  }),
  theme: z.object({
    defaultMode: z.enum(['dark', 'light', 'system']),
    allowToggle: z.boolean(),
    accent: hex,
    accentContrast: hex,
    dark: palette,
    light: palette,
    fonts: z.object({ display: z.string(), sans: z.string(), mono: z.string() }),
    radius: z.string(),
    motion: z.boolean(),
  }),
  nav: z.array(z.object({ label: z.string(), href: z.string() })),
  sections: z.object({
    impact: sectionMeta,
    about: sectionMeta,
    experience: sectionMeta,
    systems: sectionMeta,
    project: sectionMeta,
    skills: sectionMeta,
    education: sectionMeta,
    contact: sectionMeta,
  }),
  footer: z.object({ note: z.string() }),
});

export const profileSchema = z.object({
  name: z.string(),
  initials: z.string().max(3),
  role: z.string(),
  headline: z.string(),
  positioning: z.string(),
  tagline: z.string(),
  intro: z.string(),
  location: z.string(),
  email: z.email(),
  availability: z.string().optional(),
  summary: z.array(z.string()),
  primaryStack: z.array(z.string()),
  heroStack: z.array(z.string()).min(1),
  links: z.array(z.object({ label: z.string(), url: url, icon: z.enum(['github', 'linkedin', 'mail', 'link']) })),
  cv: z.object({ file: z.string(), label: z.string() }),
  phoneGate: z.object({
    enabled: z.boolean(),
    buttonLabel: z.string(),
    description: z.string(),
    endpoint: z.string(),
  }),
  contactForm: z.object({ enabled: z.boolean(), endpoint: z.string() }),
  heroVisual: z.object({
    title: z.string(),
    caption: z.string(),
    request: z.object({ method: z.string(), path: z.string() }),
    layers: z.array(z.object({ label: z.string(), detail: z.string(), tag: z.string(), icon: iconName })).min(1),
    stores: z.array(z.object({ label: z.string(), detail: z.string(), icon: iconName })).min(1),
    response: z.object({ status: z.string(), body: z.record(z.string(), z.unknown()) }),
  }),
});

export const metricSchema = z.object({
  id: z.string(),
  value: z.string(),
  suffix: z.string(),
  label: z.string(),
  context: z.string(),
  source: z.string(),
});

export const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string(),
  start: yearMonth,
  end: yearMonth.nullable(),
  summary: z.string(),
  highlights: z.array(z.string()),
  tags: z.array(z.string()),
});

const flowStep = z.object({
  label: z.string(),
  detail: z.string(),
  kind: z.enum(['external', 'service', 'store', 'user', 'decision']),
});

const diagram = z.discriminatedUnion('type', [
  z.object({ type: z.literal('flow'), caption: z.string(), steps: z.array(flowStep).min(2) }),
  z.object({
    type: z.literal('fifo'),
    caption: z.string(),
    receipt: z.number().positive(),
    currency: z.string(),
    milestones: z.array(z.object({ label: z.string(), due: z.number().positive() })).min(1),
  }),
]);

const snippet = z.object({ language: z.string(), title: z.string(), code: z.string() });

export const systemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  outcome: z.string(),
  stack: z.array(z.string()),
  points: z.array(z.string()),
  diagram,
  snippet: snippet.optional(),
});

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  featured: z.boolean(),
  title: z.string(),
  tagline: z.string(),
  stack: z.array(z.string()),
  links: z.object({ repo: url.optional(), docs: url.optional(), docsNote: z.string().optional() }),
  stats: z.array(z.object({ value: z.string(), label: z.string() })),
  highlights: z.array(z.string()),
  architecture: z.object({
    caption: z.string(),
    layers: z.array(z.object({ label: z.string(), items: z.array(z.string()) })),
  }),
  pipeline: z.object({
    caption: z.string(),
    stages: z.array(z.object({ label: z.string(), detail: z.string() })),
  }),
  roles: z.array(z.object({ name: z.string(), can: z.array(z.string()) })),
  endpoints: z.array(
    z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      path: z.string(),
      access: z.string(),
      description: z.string(),
    }),
  ),
  examples: z.array(z.object({ title: z.string(), code: z.string() })),
  caseStudy: z.array(z.object({ heading: z.string(), body: z.array(z.string()) })),
});

export const skillGroupSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  group: z.string(),
  icon: iconName,
  summary: z.string(),
  items: z.array(z.object({ name: z.string(), use: z.string().max(140) })).min(1),
});

export const aboutSchema = z.object({
  intro: z.array(z.string()).min(1),
  focus: z.string(),
  highlightsTitle: z.string(),
  highlights: z
    .array(
      z
        .object({
          /** id from metrics.json: the number is read from there, never duplicated */
          metric: z.string().optional(),
          /** short mono label for cards without a number */
          label: z.string().optional(),
          title: z.string(),
          detail: z.string(),
          icon: iconName,
        })
        .refine((h) => Boolean(h.metric) !== Boolean(h.label), 'set exactly one of "metric" or "label"'),
    )
    .min(1),
  approachTitle: z.string(),
  approachSubtitle: z.string().optional(),
  principles: z.array(z.object({ title: z.string(), detail: z.string(), icon: iconName })).min(1),
});
export const educationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
  score: z.string().optional(),
});

function parse<T extends z.ZodType>(name: string, schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${name}${i.path.length ? '.' + i.path.join('.') : ''}: ${i.message}`)
      .join('\n');
    throw new Error(`\nInvalid content in src/data/${name}.json\n${issues}\n`);
  }
  return result.data;
}

export const site = parse('site', siteSchema, siteJson);
export const profile = parse('profile', profileSchema, profileJson);
export const metrics = parse('metrics', z.array(metricSchema), metricsJson);
export const experience = parse('experience', z.array(experienceSchema), experienceJson);
export const systems = parse('systems', z.array(systemSchema), systemsJson);
export const projects = parse('projects', z.array(projectSchema), projectsJson);
export const skills = parse('skills', z.array(skillGroupSchema), skillsJson);
export const education = parse('education', z.array(educationSchema), educationJson);
export const about = parse('about', aboutSchema, aboutJson);

// Cross-file check: every highlight that references a metric must point at a real one.
for (const h of about.highlights) {
  if (h.metric && !metrics.some((m) => m.id === h.metric)) {
    throw new Error(
      `\nInvalid content in src/data/about.json\n  • highlights: unknown metric id "${h.metric}" (see metrics.json)\n`,
    );
  }
}

export const featuredProject = projects.find((p) => p.featured) ?? projects[0];

export type Site = typeof site;
export type Profile = typeof profile;
export type Experience = (typeof experience)[number];
export type System = (typeof systems)[number];
export type Project = (typeof projects)[number];
export type Diagram = System['diagram'];
export type SkillGroup = (typeof skills)[number];
export type About = typeof about;

/** Everything in one object, for pages that need several content types. */
export const portfolio = { site, profile, about, metrics, experience, systems, projects, skills, education } as const;
export type Portfolio = typeof portfolio;
