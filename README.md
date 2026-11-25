# Ravi Kumar — Portfolio

Backend-focused portfolio built with **Astro 7**, **TypeScript**, **Tailwind CSS 4** and small **React** parts for the interactive diagrams. React loads only when a diagram scrolls into view. It ships as static HTML, plus one Netlify Function for the contact form and phone-number requests.

## Quick start

```bash
npm install
npm run dev           # http://localhost:4321  (design system preview: /design-system)
npm run build         # astro check (types) + static build into dist/
npm run preview       # serve dist/
npm run lint          # ESLint (TypeScript, Astro, React hooks)
npm run format        # Prettier (with Astro + Tailwind class sorting)
npm run format:check
npm run og            # regenerate public/og/default.png from the JSON
```

`npm run dev` doesn't run the Netlify Function, so the forms will show "not configured". To test them locally, use `npx netlify dev` with a `.env` file (see `.env.example`).

## Design system

- **Tokens:** `src/styles/tokens.css` holds the type scale (`text-display`, `text-h1`…`text-micro`), weights, radii, shadows, motion durations and easing, layout spacing and breakpoints. Colours, fonts and the card radius come from `site.json` and are mapped to utilities (`bg-surface`, `text-muted`, `border-line`, `text-accent`, `font-display` …).
- **Fonts:** Geist (display), Inter (body), JetBrains Mono (labels, code, numbers). All self-hosted via Fontsource.
- **Components:** `layout/` has Container, Section, Logo, Header (navbar) and Footer. `ui/` has Button, IconButton, Card, Badge, SectionHeading, Icon and CodeBlock.
- **Motion:** CSS only. Scroll reveals use the `data-reveal` and `data-hero` attributes, and the looping hero and diagram animations use `transform`/`opacity`, so they run off the main thread. The React diagrams step through states with `useStepper` in `src/components/viz/useAnimateWhenVisible.ts`; there's no animation library. Everything respects `prefers-reduced-motion` and the `theme.motion` switch.
- **Preview:** `/design-system` shows the palette, type, components and tokens. It's marked noindex, left out of the sitemap, and not linked from the site.

## Editing content: everything is JSON

All text, numbers, links and theme settings live in `src/data/`. You never need to touch a component to update the site.

| File              | Controls                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site.json`       | SEO (title, description, URL, OG image), **theme** (accent colour, dark/light palettes, fonts, radius, motion on/off, default mode, toggle), nav links, section headings and on/off switches, footer |
| `profile.json`    | Name, role, headline, tagline, location, email, links, CV file, phone-request and contact-form settings, hero API console                                                                            |
| `metrics.json`    | Impact strip numbers (keep these CV-backed)                                                                                                                                                          |
| `experience.json` | Jobs (`start`/`end` as `YYYY-MM`, `end: null` = present)                                                                                                                                             |
| `systems.json`    | "Systems I've built" cards, with `flow` or `fifo` diagrams and optional code snippet                                                                                                                 |
| `projects.json`   | Projects; `featured: true` shows on the home page. Each gets a `/projects/<slug>` page                                                                                                               |
| `skills.json`     | Skill groups                                                                                                                                                                                         |
| `education.json`  | Degrees                                                                                                                                                                                              |

Every file is checked against a schema in `src/lib/content.ts` at build time. A typo or missing field fails the build with a message such as `site.theme.accent: must be a hex colour like #34d399`.

### Theme customisation

```jsonc
// src/data/site.json → theme
"defaultMode": "dark",        // "dark" | "light" | "system"
"allowToggle": true,          // show the sun/moon button
"accent": "#34d399",          // main accent colour
"accentContrast": "#04130d",  // text colour on accent buttons
"dark":  { "bg": "#0a0a0b", ... },
"light": { "bg": "#fafafa", ..., "accent": "#047857", "accentContrast": "#ffffff" }, // optional per-mode accent
"fonts": { "sans": "...", "mono": "..." },
"radius": "14px",
"motion": true                // false disables all animations
```

After changing the name, role or colours, run `npm run og` to refresh the social preview image.

## Visitor analytics

Off by default. In `site.json` → `analytics`, set `provider` and `id`:

| provider      | id                                                  | Notes                                            |
| ------------- | --------------------------------------------------- | ------------------------------------------------ |
| `goatcounter` | your site code (the `xyz` in `xyz.goatcounter.com`) | Free, cookieless, no consent banner needed       |
| `cloudflare`  | Web Analytics beacon token                          | Free, cookieless                                 |
| `plausible`   | your domain, e.g. `ravi-kr.netlify.app`             | Paid, cookieless                                 |
| `ga4`         | Measurement ID, e.g. `G-XXXXXXX`                    | Uses cookies; some regions need a consent notice |

The script is added only to production builds, so `npm run dev` visits aren't counted. The build fails with a clear message if you pick a provider but leave `id` empty.

## GitHub activity section

`site.json` → `github` controls it: `enabled`, `username`, `maxRepos`, `excludeRepos`, `includeForks`, `showContributions`.

- Data is fetched from GitHub's public API **at build time**; visitors' browsers never call GitHub. It refreshes on every deploy.
- Empty repos and your profile-README repo (`ravi0js/ravi0js`) are skipped automatically.
- Repo cards show the description set on GitHub (the ⚙ next to "About" on the repo page).
- `showContributions` adds the contribution heatmap. It's off for now because public activity is still sparse; switch it on once there's more.
- If GitHub is unreachable or rate-limits the build, the section shows a plain "View GitHub profile" link instead of failing. Set a `GITHUB_TOKEN` environment variable in Netlify (a token with no scopes is enough) to raise the API limit.

## Phone number on request

The phone number is **not** in the site code. A visitor clicks "Request phone number" and submits their name and email. `netlify/functions/contact.mts` then emails those details to you through [Resend](https://resend.com) and returns the number, which is shown on the page.

Set these in **Netlify → Site configuration → Environment variables**:

| Variable             | Example                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`     | `re_…`                                                                                        |
| `CONTACT_TO_EMAIL`   | your inbox                                                                                    |
| `CONTACT_FROM_EMAIL` | `Portfolio <onboarding@resend.dev>` for testing, or an address on a domain verified in Resend |
| `CONTACT_PHONE`      | `+91 …`                                                                                       |

The same function handles the "Send a message" form (name, email, subject, message). Success is shown only when the function confirms it. If the function isn't deployed or configured (for example under `npm run dev`), visitors get an honest error with your email address instead. Both forms include a honeypot field, input length limits and a basic rate limit.

## Deploy (Netlify)

`netlify.toml` already sets the build command, publish directory, functions folder, security headers and asset caching. Connect the repo in Netlify, add the environment variables above, and deploy.

## Structure

```
src/
  data/            JSON content (edit here)
  lib/             schemas + loaders, formatting, SEO helpers
  layouts/         BaseLayout (head, theme variables, JSON-LD)
  styles/          tokens.css (design tokens), global.css (base + component classes)
  components/
    layout/        Container, Section, Logo, Header, Footer
    sections/      Hero, Impact, Experience, Systems, FeaturedProject, Skills, Education, Contact
    ui/            Button, IconButton, Card, Badge, SectionHeading, Icon, CodeBlock, EndpointTable, Architecture
    viz/           React: FlowDiagram, FifoAllocation, Pipeline
  pages/           /, /projects/[slug], /cv, /design-system, 404
netlify/functions/ contact.mts
public/            cv/, og/, favicon.svg
scripts/og.mjs     social image generator
```
