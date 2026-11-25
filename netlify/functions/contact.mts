/**
 * POST /.netlify/functions/contact
 *
 * type = "message"        → emails name/email/subject/message to CONTACT_TO_EMAIL
 *                           (reply-to is the sender).
 * type = "phone_request"  → emails the requester's details to CONTACT_TO_EMAIL,
 *                           then returns CONTACT_PHONE to the visitor.
 *
 * The phone number exists only in the environment, never in the site bundle.
 *
 * Env: RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_PHONE
 */
import type { Context } from '@netlify/functions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 100, email: 200, company: 120, reason: 300, subject: 150, message: 3000 };

// Best-effort per-instance rate limit (serverless instances are short-lived; this only blunts bursts).
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_HITS;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_PHONE } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL');
    return json(503, { ok: false, error: 'Contact is not configured yet. Please email me directly.' });
  }

  if (rateLimited(context.ip ?? 'unknown')) {
    return json(429, { ok: false, error: 'Too many requests. Please try again later or email me.' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }

  // Honeypot: bots fill hidden fields. Pretend success, do nothing.
  if (typeof body.website === 'string' && body.website.length > 0) return json(200, { ok: true });

  const type = body.type === 'phone_request' ? 'phone_request' : body.type === 'message' ? 'message' : null;
  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const company = clean(body.company, LIMITS.company);
  const reason = clean(body.reason, LIMITS.reason);
  const subjectLine = clean(body.subject, LIMITS.subject).replace(/[\r\n]+/g, ' ');
  const message = clean(body.message, LIMITS.message);

  if (!type) return json(400, { ok: false, error: 'Invalid request.' });
  if (name.length < 2) return json(422, { ok: false, field: 'name', error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return json(422, { ok: false, field: 'email', error: 'Please enter a valid email.' });
  if (type === 'message' && subjectLine.length < 3)
    return json(422, { ok: false, field: 'subject', error: 'Please add a subject.' });
  if (type === 'message' && message.length < 10)
    return json(422, { ok: false, field: 'message', error: 'Please write a slightly longer message.' });
  if (type === 'phone_request' && !CONTACT_PHONE) {
    return json(503, { ok: false, error: 'Phone sharing is not configured. Please email me.' });
  }

  const when = new Date().toISOString();
  const rows: [string, string][] = [
    ['Name', name],
    ['Email', email],
    ...(company ? [['Company', company] as [string, string]] : []),
    ...(reason ? [['Reason', reason] as [string, string]] : []),
    ...(subjectLine ? [['Subject', subjectLine] as [string, string]] : []),
    ['Time (UTC)', when],
    ['Country', context.geo?.country?.name ?? 'unknown'],
  ];

  const subject =
    type === 'phone_request'
      ? `📞 Phone number requested by ${name}`
      : `✉️ ${subjectLine} (from ${name}, via portfolio)`;

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">
      <p>${type === 'phone_request' ? 'Someone viewed your phone number on your portfolio.' : 'New message from your portfolio.'}</p>
      <table cellpadding="4">${rows.map(([k, v]) => `<tr><td style="color:#666">${k}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
      ${message ? `<p style="white-space:pre-wrap;border-left:3px solid #34d399;padding-left:12px">${escapeHtml(message)}</p>` : ''}
    </div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${message ? `\n\n${message}` : ''}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: CONTACT_FROM_EMAIL, to: [CONTACT_TO_EMAIL], reply_to: email, subject, html, text }),
  });

  if (!res.ok) {
    console.error('contact: resend failed', res.status, await res.text().catch(() => ''));
    return json(502, { ok: false, error: 'Could not send right now. Please email me directly.' });
  }

  return type === 'phone_request' ? json(200, { ok: true, phone: CONTACT_PHONE }) : json(200, { ok: true });
};
