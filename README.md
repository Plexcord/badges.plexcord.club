<div align="center">
  <img src="public/favicon.png" alt="Plexcord" width="72" height="72" />

  <h1>Plexcord Badges</h1>

  <p>The badge server behind <a href="https://badges.plexcord.club">badges.plexcord.club</a>.<br />
  Donors send a picture, a person checks it, and Plexcord shows it next to their name.</p>

  <p>
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19-087ea4?logo=react" />
    <img alt="Prisma 7" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma" />
    <img alt="MySQL / MariaDB" src="https://img.shields.io/badge/MySQL%20%2F%20MariaDB-4479a1?logo=mysql&logoColor=white" />
    <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" />
  </p>
</div>

---

## What it does

| | |
| --- | --- |
| **`/badges.json`** | One public file Plexcord reads: every approved badge, grouped by Discord user ID, in the order its owner chose. |
| **Badge Explorer** | Browse every badge, search live by badge name or Discord ID, preview round (as Discord shows them) or square, and download any badge. |
| **Your panel** | Donors sign in with Discord, send a picture for review, drag their badges into order, change or delete them, and see how much of their limit is used. |
| **Admin** | Approve or reject requests side by side with the current badge, manage donors and their limits, add a badge to anyone directly, delete any badge. |

**The rules the server enforces**

- Every request is checked by an admin before it goes public; until then the picture is visible only to admins and the person who sent it.
- A donor's limit counts approved badges *and* pending new requests. Sending a new picture for the same badge replaces the earlier request instead of queueing another.
- Lowering a limit removes badges from the end of that donor's order.
- Only real images are accepted: PNG, GIF (animated is fine), WEBP or JPG, up to 10 MB, recognised by their content rather than their name.

## Quick start

You need **Node.js 22.18+** and **MySQL 8+ or MariaDB 10.4+**.

```bash
git clone <repo-url> plexcord-badges && cd plexcord-badges
npm install                  # also generates the Prisma client
cp .env.example .env         # fill it in, see below
npx prisma migrate dev       # create the tables
npm run dev                  # http://localhost:3000
```

Then make yourself the first admin. Sign in once, and run:

```sql
INSERT INTO AllowedUser (id, isAdmin, badgeLimit, createdAt)
VALUES ('<your discord id>', 1, 25, UTC_TIMESTAMP());
```

Everyone else is managed from `/admin`.

### Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | `mysql://user:password@host:3306/database` |
| `PUBLIC_URL` | The site's public URL, no trailing slash. Used for the login redirect and for badge URLs. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | From your application in the [Discord Developer Portal](https://discord.com/developers/applications). Add `${PUBLIC_URL}/api/auth/callback` under **OAuth2 → Redirects**. |
| `SESSION_SECRET` | 32 or more random characters, e.g. `openssl rand -hex 32`. Changing it signs everyone out. |
| `DATA_DIR` | Where badge images are kept (`badges/` public, `pending/` private). Defaults to `./data`. Must be writable and backed up. |
| `DONATE_URL` | Where the "donate" links point. |

## Deploying

The app runs as a plain Node.js process behind a reverse proxy. Ready-made files for a **systemd + HestiaCP (nginx)** server are in [`deploy/`](deploy).

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start -- -H 127.0.0.1 -p 8346
```

1. **Keep the project out of the web root.** Put it next to `public_html`, not inside it, so `.env` and pending uploads are never served as files.
2. **systemd:** edit the user and paths in [`deploy/plexcord-badges.service`](deploy/plexcord-badges.service), copy it to `/etc/systemd/system/`, then `systemctl enable --now plexcord-badges`. The unit makes the filesystem read-only except `.next/` and `data/`. Create `data/` before the first start and make sure the service user owns it.
3. **nginx:** copy [`deploy/hestia/nodejs.tpl`](deploy/hestia/nodejs.tpl) and [`nodejs.stpl`](deploy/hestia/nodejs.stpl) to `/usr/local/hestia/data/templates/web/nginx/` and choose `nodejs` as the domain's proxy template. They forward every path to the app, pass the `Host` header that form submissions need, and allow 12 MB uploads. On an nginx-only Hestia, use `templates/web/nginx/php-fpm/` and swap `%proxy_port%` / `%proxy_ssl_port%` for `%web_port%` / `%web_ssl_port%`.

**Updating:** `git pull && npm ci && npx prisma migrate deploy && npm run build`, then restart the service. When you sync files another way, never delete `data/` or `.env` on the server.

## API

```http
GET /badges.json
```

```json
{
  "579731384868798464": [
    { "tooltip": "Early supporter", "badge": "https://badges.plexcord.club/badges/579731384868798464/1729400000000-<sha1>.gif" }
  ]
}
```

CORS is open and responses are cached for 60 seconds. Image files live at `GET /badges/<userId>/<file>` and are cached forever; add `?download=<name>` to save one instead of opening it.

## Security

- **Sessions** are signed cookies (HMAC-SHA256, `httpOnly`, `SameSite=Lax`, `Secure` in production) that last 7 days. The Discord login is protected by a `state` check.
- **Every action re-checks who you are** on the server. Removing a donor takes effect on their next click.
- **Uploads** are recognised by their bytes, stored under random names, served with `nosniff`, and kept private until approved.
- **Image URLs** are fetched by the server with https only, no redirects, a 10 MB cap, a 20 second limit, and no access to private, loopback or link-local addresses, checked when the connection is made.
- **Headers** forbid framing the site anywhere else (`frame-ancestors 'none'`).

Found a vulnerability? Please report it privately to the maintainers instead of opening a public issue.

## Development

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build`, `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for session signing, image detection, the URL guard and download names |

```
src/
├── app/            pages, route handlers and server actions
│   ├── badges.json/   the public list
│   ├── explorer/      Badge Explorer
│   ├── panel/         donor panel
│   └── admin/         review, donors, all badges
├── components/     UI pieces
└── lib/            database, sessions, image handling
prisma/             schema and migrations
deploy/             systemd unit and nginx templates
```

## DMCA

Everything hosted here is uploaded by users. If something is yours and you want it removed, contact the Plexcord team with a link to the badge.
