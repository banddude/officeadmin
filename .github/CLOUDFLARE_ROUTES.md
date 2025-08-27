# Single-Worker Router for `officeadmin.io`

Serve your marketing site from **GitHub Pages** and your n8n app from **Railway**—all behind one Cloudflare Worker. No per-folder Cloudflare routes. One Worker that knows where to send traffic.

---

## TL;DR

- **One Cloudflare Worker route:** `officeadmin.io/*`
- Worker serves **HTML pages** from `https://banddude.github.io/officeadmin`
- Worker proxies **protected app paths** to `https://primary-production-3d94.up.railway.app`
- Handles **nested paths**, **case-insensitive** folder names, and **real 404s**
- Optional **GitHub token** for reliable case matching (avoids API rate limits)

---

## How it works

1. **Request hits** `officeadmin.io/*`.
2. If the path is **protected**, the Worker proxies it to Railway (your n8n).
3. Otherwise the Worker tries to serve **GitHub Pages HTML**:
   - `/a/b/c` → tries `/a/b/c/index.html`, then `/a/b/c.html`.
   - Resolves each segment **case-insensitively** via the GitHub API if needed.
4. If the top-level folder is on GitHub but the specific page **doesn’t exist**, the Worker returns a **404** (uses your repo’s `/404.html` if present).
5. If the top-level folder **isn’t** on GitHub, the Worker **falls back to Railway**.

> Note: The Worker serves **HTML only** from GitHub. Reference CSS/JS/images with absolute GitHub URLs (e.g., `https://banddude.github.io/officeadmin/...`) or a CDN. If you want the Worker to stream assets too, we can add that later.

---

## Protected paths (go to Railway)

These are reserved for n8n and **never** served from GitHub Pages:

```
/signin
/workflows
/executions
/credentials
/settings
/webhook
/api
/home
/rest
/assets
/static
```

Edit this list in the Worker if you change your n8n config.

---

## Case-insensitive routing

- `/ReportKit` and `/reportkit` both work.
- Deep routes are resolved segment-by-segment: `/blog/Section1` will find `Blog/section1/index.html` if that’s how it’s cased in the repo.

For maximum reliability, set `GITHUB_TOKEN` as a Worker secret to avoid GitHub API rate limits.

---

## 404 behavior (important)

If the top-level folder is on GitHub Pages **but the page doesn’t exist**, you get a **404**, not a fallback to the section root.

- ✅ `/blog/article1` → serves if `blog/article1/index.html` (or `.html`) exists.
- ❌ `/blog/article2` (missing) → **404** (renders `/404.html` if available).

If the top-level segment isn’t on GitHub (e.g., `/unknown`), the Worker hands it to Railway in case it’s an app route.

---

## Examples

| Path                       | Result                                               |
| -------------------------- | ---------------------------------------------------- |
| `/`                        | GitHub Pages root                                    |
| `/about`                   | `about/index.html`                                   |
| `/pricing`                 | `pricing/index.html`                                 |
| `/blog/section1`           | `blog/section1/index.html` (or `blog/section1.html`) |
| `/blog/section2` (missing) | **404** (uses `/404.html` if available)              |
| `/ReportKit`               | `ReportKit/index.html`                               |
| `/reportkit`               | Case-insensitive match → `ReportKit/index.html`      |
| `/signin`                  | Proxied to Railway (n8n login)                       |
| `/workflows/123`           | Proxied to Railway                                   |

---

## Setup

1. **Cloudflare** → Single route:
   - Route: `officeadmin.io/*`
   - Worker: your router Worker (this repo’s script)
2. **GitHub Pages**:
   - Repo: `banddude/officeadmin`
   - Pages base: `https://banddude.github.io/officeadmin`
   - Put pages under folders with `index.html` (e.g., `/pricing/index.html`).
   - Optional: add `/404.html` for pretty not-found pages.
3. **Railway (n8n)**:
   - Keep it running at `https://primary-production-3d94.up.railway.app`.
   - Ensure cookies/CORS are happy behind a proxy (the Worker sets the usual headers).
4. **Optional Worker secret**:
   - `GITHUB_TOKEN` → GitHub PAT with read access (public scope is enough for public repos).

---

## What changed vs the old README

- **No more per-folder Cloudflare routes** like `officeadmin.io/pricing/*`.
- **No GitHub Action** needed to auto-create routes.
- Routing is **runtime** inside the Worker—simpler, fewer moving parts.

---

## Folder layout tips

- Use `index.html` for directory-style URLs:
  ```
  /about/index.html     → https://officeadmin.io/about
  /help/faq/index.html  → https://officeadmin.io/help/faq
  ```
- Single-file pages are fine too:
  ```
  /blog/article1.html   → https://officeadmin.io/blog/article1
  ```
- For case-safety, prefer lowercase directories in the repo. The Worker will still resolve mixed case, but lowercase avoids drama.

---

## Troubleshooting

- **A GitHub page 404s but exists** → you might be hitting API rate limits for case matching. Add `GITHUB_TOKEN` to the Worker or rename the folder to lowercase.
- **Static assets not loading** → use absolute GitHub URLs or a CDN. The Worker only serves HTML from GitHub.
- **n8n login loops / cookies not sticking** → verify your n8n `WEBHOOK_URL`/base URL settings and cookie domain. The Worker forwards `X-Forwarded-Host`/`Proto` and normalizes `Origin`/`Referer`.

---

## Quick reference

- GitHub Pages base: `https://banddude.github.io/officeadmin`
- App base (proxied): `https://primary-production-3d94.up.railway.app`
- Single Cloudflare route: `officeadmin.io/*`
- Optional secret: `GITHUB_TOKEN`

---

That’s it. One Worker to babysit everything. If you want the asset-proxy patch later, say the word and I’ll drop it in.

