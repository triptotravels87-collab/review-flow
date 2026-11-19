# ReviewFlow

A single-business MVP that helps customers leave Google reviews. They scan a QR code, rate their visit, and pick from three AI-written drafts that they **edit and post themselves**. It runs on free tiers: **Vercel Hobby** for hosting and **Neon Postgres** for the database. Drafts come from Google Gemini (default `gemini-3.5-flash-lite`), which has a free tier in Google AI Studio.

- `/review` is the public, mobile-first funnel: rating, then highlights and language, then three editable drafts, then Copy & Continue to Google.
- `/admin` is password-protected. It has the QR code (PNG/SVG), A6 and table-tent PDF flyers, analytics (totals, funnel, 30-day chart, date filter), the private feedback inbox, and business settings.

## Google policy compliance

Every customer goes through the **same flow whatever their rating**. The Google link is never hidden or skipped for low ratings, and there's no "only happy customers go to Google" logic. For 1–3 stars the AI writes honest, constructive drafts, and the customer is told to edit them so they reflect their real experience. "Contact us privately" appears on every screen for everyone. It's optional and doesn't depend on the rating.

## Project structure

```
prisma/
  schema.prisma              Event, PrivateFeedback, RateLimit, Settings
  migrations/0001_init/      initial SQL migration
src/
  middleware.ts              protects /admin, /api/admin/*, /api/qr, /api/flyer
  app/
    review/page.tsx          public funnel (server shell, client ReviewFunnel)
    admin/                   login, dashboard, analytics (Recharts)
    api/
      generate-drafts/       POST  AI drafts (Zod, retry, rate limits, maxDuration=10)
      events/                POST  funnel event tracking
      private-feedback/      POST  private message (+ PRIVATE_CONTACT event)
      qr/                    GET   ?format=png|svg&download=1          (admin)
      flyer/                 GET   ?variant=a6|tent                    (admin)
      admin/login|logout     POST  password, then signed httpOnly cookie (jose)
      admin/stats            GET   ?from=YYYY-MM-DD&to=YYYY-MM-DD      (admin)
      admin/settings         GET/PUT  single-row Settings overrides     (admin)
  components/                ReviewFunnel, PrivateContact
  lib/                       env, prisma singleton, session, rate limiter, drafts (prompt + parser),
                             llm (Gemini, @google/genai), analytics SQL, qr, flyer (pdf-lib)
tests/                       Vitest: LLM output parsing, input schema, rate limiter
```

## API contracts

| Route | Request | Response |
|---|---|---|
| `POST /api/generate-drafts` | `{ rating: 1-5, highlights?: string[] (≤5), language: "en"\|"hi"\|"hinglish"\|"ta"\|"bn"\|"mr"\|"te"\|"gu", staffName?: string }` | `200 { drafts: [string,string,string] }`, `400` validation, `429` rate limited, `502/503 { error: "Couldn't generate, try again" }` |
| `POST /api/events` | `{ type: "SCAN"\|"DRAFTS_VIEWED"\|"DRAFT_COPIED"\|"GOOGLE_REDIRECT", sessionId: uuid, rating?, language?, source? }` | `200 { ok: true }` |
| `POST /api/private-feedback` | `{ message, name?, contact?, rating?, sessionId? }` | `200 { ok: true }` |
| `POST /api/admin/login` | `{ password }` | `200` + `rf_admin` cookie, `401`, `429` |
| `GET /api/admin/stats` | `?from&to` (default: last 30 days) | `{ totals, funnel[], daily[], scansBySource[], timezone }` |

Highlights and staff names are checked against the configured chips on the server, so customers can't inject free text into the prompt.

**Rate limits** use the `RateLimit` table with an atomic `INSERT … ON CONFLICT`:
- AI drafts: 10 per 10 minutes per salted IP hash, plus a global `DAILY_AI_LIMIT` per UTC day (default 300).
- Events: 120 per 10 minutes.
- Private feedback: 5 per 10 minutes.
- Admin login: 10 attempts per 10 minutes.

Raw IPs are never stored.

## Local setup

Requires Node 18.18+ (tested on Node 24).

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see below)
npx prisma migrate deploy   # create tables in your Neon DB
npm run dev                 # http://localhost:3000
```

Other commands:

```bash
npm test            # unit tests (no DB or API key needed)
npm run typecheck
npm run build
```

### How to test each part locally

1. **Funnel:** open `http://localhost:3000/review?src=qr`. Pick a rating, then highlights and a language, and you'll see three drafts. Edit one, then tap Copy & Continue: the text is copied and you're sent to `GOOGLE_REVIEW_URL`.
2. **Admin auth:** `/admin` redirects to `/admin/login`. A wrong password returns 401, and the right one sets the cookie. Log out from the dashboard.
3. **Drafts API:**
   ```bash
   curl -X POST localhost:3000/api/generate-drafts -H "content-type: application/json" -d "{\"rating\":2,\"language\":\"hinglish\",\"highlights\":[\"Speed\"]}"
   ```
   The 11th call within 10 minutes returns 429.
4. **Events and analytics:** walk through the funnel a few times, then check the totals, funnel and chart in `/admin`. Change the date range and press Apply.
5. **QR and flyers:** in `/admin`, use Download PNG/SVG and the A6 / Table tent buttons. The QR encodes `${NEXT_PUBLIC_SITE_URL}/review?src=qr`, so set that to your real domain before printing.
6. **Private feedback:** click "Contact us privately" on any funnel screen and send a message. It shows up in the dashboard inbox.

## Neon setup (step by step)

1. Sign up at [neon.tech](https://neon.tech) and click **Create project**. Pick a region close to your Vercel region (for example AWS `ap-southeast-1` for India and `iad1` for US East).
2. In the project dashboard, click **Connect**.
   - With **Connection pooling ON**, copy the string (the host contains `-pooler`). Use it as `DATABASE_URL`, and append `&pgbouncer=true&connect_timeout=15`.
   - With **Connection pooling OFF**, copy the direct string. Use it as `DIRECT_URL`.
3. Put both in `.env` and run the migrations from your machine:
   ```bash
   npx prisma migrate deploy
   ```
   `migrate deploy` uses `DIRECT_URL`, because migrations need a non-pooled connection. Run it again whenever new migrations are added. During development, after changing `schema.prisma`, run `npm run db:migrate -- --name <change>` to create a new migration.

## Deploy to Vercel (Hobby)

1. Push this repo to GitHub.
2. In Vercel, go to **Add New… → Project**, import the repo, and keep the framework preset **Next.js**. The build command is already `prisma generate && next build`.
3. Under **Settings → Environment Variables**, add each variable from `.env.example` for Production (and Preview if you want):
   - `DATABASE_URL`, `DIRECT_URL`
   - `GEMINI_API_KEY` (create one at https://aistudio.google.com/apikey), `GEMINI_MODEL` (`gemini-3.5-flash-lite`), `DAILY_AI_LIMIT`
   - `ADMIN_PASSWORD`, `SESSION_SECRET` (32+ random chars: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), optionally `IP_HASH_SALT`
   - `NEXT_PUBLIC_SITE_URL`: your production URL, for example `https://reviews.example.com`. Redeploy after changing it, because `NEXT_PUBLIC_*` values are baked in at build time.
   - `BUSINESS_NAME`, `BUSINESS_CATEGORY`, `BUSINESS_CITY`, `GOOGLE_REVIEW_URL`, `BUSINESS_KEYWORDS`, `BUSINESS_STAFF`, `BUSINESS_SERVICES`, `BRAND_COLOR`, `CONTACT_EMAIL_OR_PHONE`, optional `BUSINESS_LOGO_URL`, optional `ANALYTICS_TIMEZONE` (for example `Asia/Kolkata`; default `UTC`)
4. Deploy. Then open `https://<your-domain>/admin`, log in, download the QR or flyer, and print it.

To find `GOOGLE_REVIEW_URL`, look up your Place ID with Google's Place ID Finder and use `https://search.google.com/local/writereview?placeid=<PLACE_ID>`.

### Free-tier notes

- Vercel Hobby functions time out at about 10 seconds. The draft route sets `maxDuration = 10`, and the Gemini call has an 8-second total budget, including one retry when the reply can't be parsed. Output is requested as JSON with a response schema, then validated again with Zod.
- Gemini's free tier has per-minute and per-day request limits. Keep `DAILY_AI_LIMIT` at or below your key's daily quota. If you go over, customers see "Couldn't generate, try again" and can still go straight to Google.
- The flyer uses `pdf-lib`, so no headless browser is needed and functions stay small.
- Neon's free tier auto-suspends when idle, so the first request after a pause can take about a second longer.

## Extending later

These are out of scope for the MVP, but the design leaves room for them:
- **Multi-business:** add a `Business` table, put a `businessId` on `Event`, `PrivateFeedback` and `Settings`, and resolve the business from a slug in `/review/[slug]`.
- **Google Business Profile auto-replies:** add an `integrations/` module plus a scheduled job (Vercel Cron).
- **Billing:** a Stripe webhook route plus a plan field.
