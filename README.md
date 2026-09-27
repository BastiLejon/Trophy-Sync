# Trophy Sync

Web app that reads PlayStation trophies and mirrors them **symbolically** as Xbox achievements.
Users sign in with both accounts to prove ownership. An admin maintains a one-time mapping between
PlayStation games/trophies and Xbox titles/achievements. After a sync, users see what was transferred and
what was not, and can browse an "Xbox profile" view with Gamerscore (real Xbox achievements + PS sync).

> Real Xbox achievements cannot be unlocked from outside. The transfer is symbolic and exists only in this app.

UI language: English by default, German via the EN/DE switch in the header.

## Quick start (demo mode)

```bash
npm install
npm run dev        # http://localhost:3000
```

In development demo mode is on: both sign-in pages offer **"Sign in as demo player"**. The admin area at
`/admin` uses the password `admin`. The demo data deliberately contains:

- games that exist on both platforms (Hades, Stardew Valley, Celeste – already mapped by the "seed admin")
- games awaiting an admin decision (Hollow Knight, Cyberpunk 2077, Ghost of Tsushima)
- a PlayStation exclusive without counterpart (Ratchet & Clank: Rift Apart)
- trophies that are already unlocked for real on Xbox (Hades: "Escaped Tartarus", "The Useless Trinket")
- Platinum trophies (no Xbox equivalent) and a renamed trophy (Cyberpunk "Gun Fu" → "Gunslinger")

Suggested demo walkthrough: sign in with both demo accounts → sync → inspect the result → as admin map
Hollow Knight under `/admin/games` → sync again → open the Xbox profile.

## How it works

1. **PlayStation sign-in (NPSSO):** Sony's "Sign in with PlayStation Network" OAuth is only available to
   approved partners (Discord, Twitch, Epic, …), not to arbitrary websites. So the user signs in at Sony,
   opens `https://ca.account.sony.com/api/v1/ssocookie` and pastes the NPSSO token. Only the signed-in owner
   can retrieve it, which proves ownership. The token is exchanged immediately for access/refresh tokens
   (library `psn-api`, the same API the PlayStation app uses). The NPSSO itself is not stored.
2. **Xbox sign-in (Microsoft OAuth):** redirect to `login.live.com` with scope `XboxLive.signin offline_access`,
   then exchange for an Xbox user token and an XSTS token. Read access to profile, title history and achievements.
3. **Import:** PS games/trophies and Xbox titles/achievements are stored in a shared catalog (once per game,
   not per user). Real Xbox unlocks are stored per user.
4. **Admin mapping:** every new PS game gets an Xbox title suggestion by name similarity. After the decision the
   trophies are compared with the achievements (name + description). Matches at or above `AUTO_MAP_THRESHOLD`
   (default 0.92) are accepted automatically, the rest waits for the admin. Platinum trophies are marked
   "no counterpart" automatically. The mapping is global and done once.
5. **Sync:** every earned trophy is resolved through the mapping. Per-trophy results: `newly transferred`,
   `already transferred`, `already unlocked on Xbox` (real unlock wins), `trophy/game awaits admin mapping`,
   `no counterpart`. Symbolic unlocks are credited with the mapped achievement's Gamerscore. If a mapping is
   removed later, the symbolic unlock disappears on the next sync.
6. **Account pairing:** on the first sync the PSN account and the Xbox account are paired permanently in a
   central table. A paired account cannot be unlinked or combined with another account; an admin can release
   a pairing under `/admin/pairings`.
7. **Xbox profile:** gamertag, Gamerscore (Xbox + PS sync), games with progress and achievement lists including
   source (Xbox / PS sync with the originating trophy), rarity and unlock date.

## Game IDs and matching

Sony and Microsoft do not share a cross-platform game ID. PlayStation identifies trophy sets by
`npCommunicationId` (e.g. `NPWR21215_00`), Xbox uses a numeric `titleId`. Trophy Sync therefore matches by
normalized name similarity (edition suffixes, platform tags and punctuation are ignored) and lets the admin
confirm. Trophies vs. achievements are matched by name and description so that renamed entries are still found.

## Configuration

See `.env.example`.

| Variable | Meaning |
| --- | --- |
| `DEMO_MODE` | Enables demo sign-in. Default: on in development, off in production. |
| `SESSION_SECRET` | ≥ 32 random characters, encrypts session cookies. Required in production. |
| `TOKEN_ENCRYPTION_KEY` | Key for PSN/Xbox tokens at rest (AES-256-GCM). Defaults to `SESSION_SECRET`. |
| `ADMIN_PASSWORD` | Password for `/admin`. ≥ 12 characters required in production. |
| `APP_URL` | Public URL, used for the OAuth redirect and the Secure cookie flag. |
| `XBOX_CLIENT_ID`, `XBOX_CLIENT_SECRET` | Microsoft Entra app registration for the Xbox sign-in. |
| `DATABASE_PATH` | SQLite file path (default `./data/trophy-sync.db`). |
| `AUTO_MAP_THRESHOLD` | Similarity threshold for automatic trophy mapping. |

The server refuses to start in production with the development defaults for `SESSION_SECRET` or `ADMIN_PASSWORD`.

### Xbox Live setup (free)

1. In the [Microsoft Entra admin center](https://entra.microsoft.com) (or Azure portal → App registrations)
   create an app registration. A free Microsoft account is enough; no Azure subscription or credit card needed.
   Supported account types: "Personal Microsoft accounts only" or "All accounts".
2. Redirect URI (Web): `${APP_URL}/api/auth/xbox/callback`.
3. Create a client secret and put both values in `.env`.

The Xbox catalog fills itself with titles played by linked Xbox accounts (the Xbox achievements API returns
the full achievement list, including locked ones, for any title a user has launched). The admin can also
import titles by title ID via their own Xbox account or from JSON under `/admin/catalog`.

### PlayStation

No app credentials are needed. The server must be able to reach `ca.account.sony.com` and
`m.np.playstation.com`.

## Security notes

- Session cookies: encrypted, `HttpOnly`, `SameSite=Lax`, `Secure` when `APP_URL` is https.
- PSN/Xbox tokens are encrypted at rest with AES-256-GCM.
- Admin login is throttled (5 failures → 15 minutes block, per IP, in-memory).
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), no `X-Powered-By`.
- Server Actions are origin-checked by Next.js (CSRF protection).
- Put the app behind HTTPS (reverse proxy such as Caddy/nginx or a platform that terminates TLS).

## Deployment (Docker)

```bash
cp .env.example .env    # set SESSION_SECRET, ADMIN_PASSWORD, APP_URL, DEMO_MODE=false, Xbox credentials
docker compose up -d --build
```

The SQLite database lives in the `trophy-data` volume. Note: the Docker image was written but could not be
built in the development environment (no Docker daemon); `npm run build` + `npm start` are verified.

## Tech

- Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4
- SQLite via `better-sqlite3` + Drizzle ORM (migrations in `drizzle/`, applied on startup)
- `iron-session` for encrypted cookies, `psn-api` for PSN, Xbox Live via REST
- Vitest tests for matching, sync engine, pairing and token encryption (`npm test`)

```
src/lib/providers/   PSN and Xbox clients (real + demo), demo data
src/lib/matching.ts  name normalisation + similarity (Dice/Jaccard)
src/lib/catalog.ts   catalog upserts, mapping suggestions, admin decisions
src/lib/accounts.ts  account linking, token refresh, library import, pairings
src/lib/sync.ts      sync run and result classification
src/lib/i18n/        UI messages (en, de)
src/app/             pages: sign-in, overview, sync, Xbox profile, admin
```

## Commands

```bash
npm run dev        # development
npm run build      # production build
npm start          # production server
npm test           # tests
npm run lint       # ESLint
npm run typecheck  # TypeScript
```
