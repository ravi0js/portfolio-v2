# Ravi Kumar — Portfolio

Backend-focused portfolio built with **Astro 7**, **TypeScript**, **Tailwind CSS 4** and small **React** parts for the interactive diagrams. It ships as static HTML, plus one Netlify Function for the contact form and phone-number requests.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # type-check + static build into dist/
npm run preview    # serve dist/
npm run og         # regenerate public/og/default.png from the JSON
```

`npm run dev` doesn't run the Netlify Function, so the forms will show "not configured". To test them locally, use `npx netlify dev` with a `.env` file (see `.env.example`).

## Editing content: everything is JSON

All text, numbers, links and theme settings live in `src/data/`. You never need to touch a component to update the site.

| File | Controls |
|---|---|
| `site.json` | SEO (title, description, URL, OG image), **theme** (accent colour, dark/light palettes, fonts, radius, motion on/off, default mode, toggle), nav links, section headings and on/off switches, footer |
| `profile.json` | Name, role, headline, tagline, location, email, links, CV file, phone-request and contact-form settings, hero API console |
| `metrics.json` | Impact strip numbers (keep these CV-backed) |
| `experience.json` | Jobs (`start`/`end` as `YYYY-MM`, `end: null` = present) |
| `systems.json` | "Systems I've built" cards, with `flow` or `fifo` diagrams and optional code snippet |
| `projects.json` | Projects; `featured: true` shows on the home page. Each gets a `/projects/<slug>` page |
| `skills.json` | Skill groups |
| `education.json` | Degrees |

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

## Phone number on request

The phone number is **not** in the site code. A visitor clicks "Request phone number" and submits their name and email. `netlify/functions/contact.mts` then emails those details to you through [Resend](https://resend.com) and returns the number, which is shown on the page.

Set these in **Netlify → Site configuration → Environment variables**:

| Variable | Example |
|---|---|
| `RESEND_API_KEY` | `re_…` |
| `CONTACT_TO_EMAIL` | your inbox |
| `CONTACT_FROM_EMAIL` | `Portfolio <onboarding@resend.dev>` for testing, or an address on a domain verified in Resend |
| `CONTACT_PHONE` | `+91 …` |

The same function handles the "Send a message" form. Both forms include a honeypot field, input length limits and a basic rate limit.

## Deploy (Netlify)

`netlify.toml` already sets the build command, publish directory, functions folder, security headers and asset caching. Connect the repo in Netlify, add the environment variables above, and deploy.

## Structure

```
src/
  data/            JSON content (edit here)
  lib/             schemas + loaders, formatting, SEO helpers
  layouts/         BaseLayout (head, theme variables, JSON-LD)
  components/
    layout/        Header, Footer, Section
    sections/      Hero, Impact, Experience, Systems, FeaturedProject, Skills, Education, Contact
    ui/            Icon, CodeBlock, EndpointTable, Architecture
    viz/           React: FlowDiagram, FifoAllocation, Pipeline
  pages/           /, /projects/[slug], /cv, 404
netlify/functions/ contact.mts
public/            cv/, og/, favicon.svg
scripts/og.mjs     social image generator
```
