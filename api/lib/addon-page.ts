import { escapeHtml } from './addon-html-escape.js';

export type AddonPageStatus =
  | 'confirm'
  | 'success'
  | 'already'
  | 'expired'
  | 'invalid'
  | 'inactive'
  | 'error';

export interface AddonPageModel {
  status: AddonPageStatus;
  label?: string;
  isOnetime?: boolean;
  token?: string;
  firstName?: string;
  nextBillingAt?: string | null;
}

const COPY: Record<
  AddonPageStatus,
  { title: string; body: string; showForm?: boolean }
> = {
  confirm: {
    title: 'Add this to your next delivery?',
    body: '',
    showForm: true,
  },
  success: {
    title: "It's on your next delivery",
    body: '',
  },
  already: {
    title: 'Already on your next order',
    body: "This is already sitting on your subscription, so we didn't add it again.",
  },
  expired: {
    title: 'This link has expired',
    body: "That offer's run out. Reply to the email if you'd still like it added — a real person reads those.",
  },
  invalid: {
    title: "This link isn't valid",
    body: "It may have been copied wrong, or it wasn't meant for this subscription. Reply to the email and we'll sort it.",
  },
  inactive: {
    title: "We couldn't add this right now",
    body: "Your subscription isn't currently set to receive orders. Reply to the email if you want a hand with it.",
  },
  error: {
    title: 'Something went wrong',
    body: "We couldn't update your subscription just then. Give it another try in a minute, or reply to the email.",
  },
};

function formatBillingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function greeting(firstName?: string): string {
  const name = firstName?.trim();
  if (!name) return '';
  return `Hi ${escapeHtml(name)} — `;
}

function productLine(model: AddonPageModel): string {
  const label = escapeHtml(model.label || 'this');
  if (model.status === 'confirm') {
    const cadence = model.isOnetime
      ? "Just this next delivery — it won't stay on future orders."
      : "It'll come with every delivery from now on. You can remove it any time.";
    const when = model.nextBillingAt
      ? ` Next charge is ${escapeHtml(formatBillingDate(model.nextBillingAt))}.`
      : '';
    return `${greeting(model.firstName)}we'll add <strong>${label}</strong> to your Little Green Dog subscription. ${cadence}${when}`;
  }
  if (model.status === 'success') {
    const cadence = model.isOnetime
      ? "It's a one-off on this next order."
      : "It'll be on every delivery from here.";
    const when = model.nextBillingAt
      ? ` Charged with your order on ${escapeHtml(formatBillingDate(model.nextBillingAt))}.`
      : " You'll be charged with that delivery — no extra checkout.";
    return `${greeting(model.firstName)}we've added <strong>${label}</strong> to your subscription. ${cadence}${when}`;
  }
  return COPY[model.status].body;
}

export function renderAddonPage(model: AddonPageModel): string {
  const copy = COPY[model.status];
  const tone =
    model.status === 'success' || model.status === 'already'
      ? 'ok'
      : model.status === 'confirm'
        ? 'ask'
        : 'warn';

  const form = copy.showForm && model.token
    ? `<form method="post" action="/add-to-subscription">
        <input type="hidden" name="t" value="${escapeHtml(model.token)}" />
        <button type="submit">Yes, add it</button>
      </form>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapeHtml(copy.title)} · little green dog</title>
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
  <style>
    :root {
      --green: #ACD45C;
      --green-text: #5a7d27;
      --text: #1a1a1a;
      --muted: #555;
      --bg: #fdfcf8;
      --card: #fff;
      --border: #e8e8e4;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background:
        radial-gradient(1200px 500px at 50% -10%, #e8f5c8 0%, transparent 55%),
        var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    main {
      max-width: 34rem;
      margin: 0 auto;
      padding: 2.5rem 1.25rem 4rem;
    }
    .brand {
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
      font-size: 0.95rem;
      letter-spacing: -0.02em;
      text-decoration: none;
      color: var(--text);
    }
    .brand span { color: var(--green); }
    .card {
      margin-top: 2rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem 1.6rem 1.75rem;
      box-shadow: 0 8px 28px rgba(0,0,0,0.06);
    }
    .eyebrow {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--green-text);
      margin-bottom: 0.7rem;
    }
    h1 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-weight: 400;
      font-size: 1.85rem;
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin: 0 0 0.85rem;
    }
    p { margin: 0; color: var(--muted); }
    .ask h1 { font-size: 2rem; }
    button {
      display: inline-block;
      margin-top: 1.5rem;
      font-family: inherit;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text);
      background: var(--green);
      border: 1.5px solid var(--green);
      border-radius: 8px;
      padding: 0.85rem 1.4rem;
      cursor: pointer;
    }
    button:hover { filter: brightness(0.97); }
    button:focus-visible { outline: 2px solid var(--green-text); outline-offset: 3px; }
    .foot {
      margin-top: 1.75rem;
      font-size: 0.9rem;
    }
    .foot a { color: var(--green-text); }
    .mark {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      margin-bottom: 0.9rem;
      background: #e8f5c8;
    }
    .warn .mark { background: #f6efe4; }
  </style>
</head>
<body>
  <main>
    <a class="brand" href="https://www.littlegreendog.co.nz">little green <span>dog</span></a>
    <section class="card ${tone}">
      <div class="mark" aria-hidden="true">${tone === 'ok' ? '✓' : tone === 'ask' ? '+' : '!'}</div>
      <span class="eyebrow">Your subscription</span>
      <h1>${escapeHtml(copy.title)}</h1>
      <p>${productLine(model)}</p>
      ${form}
      <p class="foot">Questions? <a href="https://www.littlegreendog.co.nz/pages/contact-us">Get in touch</a> — or just reply to the email.</p>
    </section>
  </main>
</body>
</html>`;
}
