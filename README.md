# Mahfaza

Mahfaza (محفظة) is a personal money ledger for one person: Mohammed, in Malaysia. Ringgit, `Asia/Kuala_Lumpur`. It does not move real money. RHB and Touch 'n Go stay in his banking apps. This app remembers the boxes, does the morning maths, and asks for a tap when something should be written down.

RHB is the only bank balance. Inside it sit three virtual boxes — Treasury, Monthly, and Emergency. Daily is the Touch 'n Go wallet, topped up by hand from Monthly.

## What it does each day

The rules live in `src/lib/money/algorithm.ts` (decision D-R-064).

- Treasury is the first RM 2,000 of RHB. It is topped up from RHB and it funds nothing. It does not fall below 2,000.
- Income is recorded only when he says it arrived. Bills come off first (rent 400, internet 38, electricity = 25 plus anything over 75 on the household bill, otherwise 170). Monthly is filled to the target pace plus a buffer. Treasury is restored to 2,000. The rest splits between Emergency and Treasury. Emergency's share is `0.20 + 0.65 ×` how far the fund is from its target. Spare cents go to Emergency.
- The daily top-up is not a fixed number. Each morning it is a trimmed mean of spending, clipped between 12 and 35, smoothed against yesterday, then cut by the safe amount (what Monthly can still spare). There is a light carry after the first day. Missed days are not back-filled. Daily may go negative; nothing else covers it.
- A day is flagged when spending is over twice the usual day, or a merchant is new in the last 90 days.
- Saturday stores a 0–100 health score and one line about what the system learned.
- On the last evening of the month, leftover Monthly is offered back to RHB and split by the same rule. One tap applies it.

Food, groceries, delivery, and light transport are one Daily category. There is no cap on it.

`npm test` checks the morning maths against the published 11 Nov 2026 worked example (daily 18.00, target 24.03, safe 23.77, 15/85 split, emergency target 1,539.52, forecast 127.52, runway 19, health 55) using an equivalent constructed series. His real transaction file is not in this repository.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000. The first screen asks for a 4-digit PIN and confirms the opening balances (editable). Without `DATABASE_URL`, state is stored in `.data/mahfaza.json`, which is gitignored.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | On Vercel | Neon (or any Postgres) connection string. The `mahfaza_state` table is created on first use. |
| `AUTH_SECRET` | On Vercel | Signs the session cookie. |
| `CRON_SECRET` | On Vercel | Vercel Cron must send `Authorization: Bearer <CRON_SECRET>`. |
| `APP_PIN` | No | Optional 4–6 digit PIN that is always accepted, including as a recovery PIN. |

Locally, if `AUTH_SECRET` is missing, a dev secret is written to `.data/dev-secret`.

## Database

Neon is the intended host (Vercel Marketplace → Neon, or [neon.tech](https://neon.tech)). Paste the pooled connection string into `DATABASE_URL` (the host contains `-pooler`). Keep `DATABASE_URL_UNPOOLED` for migrations only. Functions are pinned to Singapore (`sin1` in `vercel.json`) so they sit next to that database.

One row holds the whole wallet as JSON, plus a version used so two saves cannot overwrite each other. Every balance change keeps an undo frame and an audit line. Undo is on the History screen.

There is also **Download a backup** / **Restore a backup** under Settings. The backup does not include the PIN hash.

## The clock

Opening the app runs a scheduled job only when that job is actually due, so a phone is enough before hosting is wired up. On Vercel, `vercel.json` calls `GET /api/cron` in UTC, which is Malaysia time (UTC+8, no daylight saving):

| Job | UTC | Malaysia |
| --- | --- | --- |
| Morning top-up, forecast, anomalies | 16:05 daily | 00:05 |
| Evening balance snapshot | 15:00 daily | 23:00 |
| Weekly review | 16:10 Friday | 00:10 Saturday |
| Month-end sweep proposal | 15:50 on the 28th–31st | 23:50, and only if that date is the last day |

The handler checks the Malaysia clock again, so a cron tick at the wrong hour does not close the month early. The same function refuses a second run of the same job on the same day. Money still moves only after a tap.

If income is logged, the app proposes the full distribution (bills, Monthly, Treasury refill, then the split). One confirm writes it.

## Deploy

Team: [modomking18-6641s-projects](https://vercel.com/modomking18-6641s-projects).

```bash
npx vercel login
npx vercel link --scope modomking18-6641s-projects
npx vercel env add DATABASE_URL production
npx vercel env add AUTH_SECRET production
npx vercel env add CRON_SECRET production
npx vercel --prod
```

Cron jobs are picked up from `vercel.json` on that production deploy. Set the same env vars for Preview if you use preview URLs.

Until `DATABASE_URL` is set, a production deploy shows a short setup note instead of the wallet.

## Privacy

Do not commit a bank export. Settings → Import a CSV reads a file in the browser upload and stores it only in the database (or the local `.data` file). A simple sheet (`date,amount,merchant,category`) works, and so does the older ledger export with an `event_id` / `notes` header. Transfers are left out unless you edit the preview by including only expense rows the parser marks.

## Phone

The app is a light-theme PWA (`manifest.ts`, `public/sw.js`). Add it to the home screen from the browser. Notifications are local: after you allow them in Settings, opening the app can raise the morning reminder. They are not remote push (that would need VAPID keys, which are not set up).

English is the default. The ع / EN switch flips the whole interface, including right-to-left layout. There is no dark theme.

## Scripts

- `npm test` — the money rules
- `npm run typecheck`
- `npm run dev` / `npm run build`
