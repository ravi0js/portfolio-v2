// Refreshes the static JobBoard API docs from the repo's committed OpenAPI spec.
// Run: npm run docs:sync   (then commit public/docs/jobboard-api/openapi.json)
import { writeFile } from 'node:fs/promises';
import profile from '../src/data/profile.json' with { type: 'json' };

const SOURCE = 'https://raw.githubusercontent.com/ravi0js/jobboard-api/main/storage/api-docs/api-docs.json';
const OUT = new URL('../public/docs/jobboard-api/openapi.json', import.meta.url);

const res = await fetch(SOURCE, { signal: AbortSignal.timeout(15000) });
if (!res.ok) throw new Error(`Could not fetch spec: HTTP ${res.status}`);
const spec = await res.json();

// Use the portfolio's public contact email everywhere in the published copy.
let text = JSON.stringify(spec, null, 2);
for (const email of new Set(text.match(/[\w.+-]+@gmail\.com/g) ?? [])) {
  if (email !== profile.email) text = text.replaceAll(email, profile.email);
}
await writeFile(OUT, text + '\n');
const ops = Object.values(spec.paths).reduce(
  (n, p) => n + Object.keys(p).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length,
  0,
);
console.log(`wrote ${OUT.pathname} (OpenAPI ${spec.openapi}, ${ops} operations)`);
