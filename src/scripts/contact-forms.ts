/**
 * Client-side behaviour for the contact form and the phone-request form.
 *
 * Integration point: both forms POST JSON to the URL in their `data-endpoint`
 * attribute (profile.json → contactForm.endpoint / phoneGate.endpoint), which is
 * the Netlify Function in netlify/functions/contact.mts. It sends email through
 * Resend using server-side environment variables; no secrets live in this file.
 *
 * Honesty rules:
 * - Success is shown only when the endpoint answers 2xx with { ok: true }.
 * - If the endpoint is missing (e.g. `npm run dev`, or env vars not set yet),
 *   the user sees an error with a direct email link instead.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Rule = (value: string) => string | null;

export const rules: Record<string, Rule> = {
  name: (v) => (v.trim().length < 2 ? 'Please enter your name (at least 2 characters).' : null),
  email: (v) =>
    !v.trim()
      ? 'Please enter your email address.'
      : !EMAIL_RE.test(v.trim())
        ? 'Please enter a valid email address, like name@example.com.'
        : null,
  subject: (v) => (v.trim().length < 3 ? 'Please add a subject (at least 3 characters).' : null),
  message: (v) => (v.trim().length < 10 ? 'Please write a message of at least 10 characters.' : null),
};

type Field = HTMLInputElement | HTMLTextAreaElement;

function fieldsOf(form: HTMLFormElement): Field[] {
  return [...form.querySelectorAll<Field>('[data-validate]')];
}

export function setFieldError(field: Field, message: string | null) {
  const err = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (err) {
    err.textContent = message ?? '';
    err.hidden = !message;
  }
}

function validateField(field: Field): boolean {
  const rule = rules[field.dataset.validate ?? ''];
  const message = rule ? rule(field.value) : null;
  setFieldError(field, message);
  return !message;
}

/** Validates every field; focuses the first invalid one. */
export function validateForm(form: HTMLFormElement): boolean {
  let firstInvalid: Field | null = null;
  for (const f of fieldsOf(form)) if (!validateField(f) && !firstInvalid) firstInvalid = f;
  firstInvalid?.focus();
  return !firstInvalid;
}

/** After the first submit attempt, re-validate fields as the user types. */
export function liveValidate(form: HTMLFormElement) {
  for (const f of fieldsOf(form)) {
    f.addEventListener('input', () => {
      if (form.dataset.attempted) validateField(f);
    });
    f.addEventListener('blur', () => {
      if (form.dataset.attempted || f.value.trim()) validateField(f);
    });
  }
}

export type SubmitResult =
  | { kind: 'ok'; data: Record<string, unknown> }
  | { kind: 'error'; message: string; field?: string }
  | { kind: 'unavailable' };

/** POSTs the form as JSON. Never reports success unless the server confirms it. */
export async function submitForm(form: HTMLFormElement, extra: Record<string, string>): Promise<SubmitResult> {
  const endpoint = form.dataset.endpoint;
  if (!endpoint) return { kind: 'unavailable' };
  const payload = { ...Object.fromEntries(new FormData(form).entries()), ...extra };
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { kind: 'unavailable' };
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? ((await res.json().catch(() => null)) as Record<string, unknown> | null) : null;
  if (!body) return { kind: 'unavailable' }; // e.g. 404 HTML page: no function deployed here
  if (res.ok && body.ok === true) return { kind: 'ok', data: body };
  return {
    kind: 'error',
    message: typeof body.error === 'string' ? body.error : 'Something went wrong.',
    field: typeof body.field === 'string' ? body.field : undefined,
  };
}

/** Shows a status message box (success or error) inside the form. */
export function showStatus(form: HTMLFormElement, tone: 'ok' | 'error' | null, html = '') {
  const box = form.querySelector<HTMLElement>('[data-status]');
  if (!box) return;
  box.hidden = !tone;
  box.dataset.tone = tone ?? '';
  box.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  const text = box.querySelector<HTMLElement>('[data-status-text]');
  if (text) text.innerHTML = html;
}

export function setBusy(form: HTMLFormElement, busy: boolean) {
  const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  form.setAttribute('aria-busy', String(busy));
  if (!btn) return;
  btn.disabled = busy;
  btn.dataset.busy = String(busy);
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
