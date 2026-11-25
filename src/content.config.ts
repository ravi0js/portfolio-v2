/**
 * Long-form articles written for this site (Markdown in src/content/articles/).
 * Drafts (draft: true) are visible in `npm run dev` with a "Draft" banner, and are
 * excluded from production builds and from the Blog list until you set draft: false.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
  }),
});

export const collections = { articles };
