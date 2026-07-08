# peckenpaugh.us

Personal site + blog. Astro, zero client JS except a theme toggle and the
hero animation. Design: warm paper / ink / Praat pitch-blue, Fraunces +
IBM Plex Sans/Mono, fonts self-hosted via Fontsource (no external requests).

## Develop

Requires Node 22 (see `.nvmrc`).

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # -> dist/
pnpm preview    # serve the build
```

## Add a blog post

Drop a Markdown file in `src/content/writing/`. Frontmatter:

```yaml
---
title: Your title
description: One-line summary (used for the card + meta description).
date: 2026-07-07
draft: false   # omit or false to publish
---
```

The filename becomes the URL slug (`/writing/<filename>/`).

## Structure

- `src/pages/index.astro` — home (hero, work, about, writing teaser)
- `src/pages/writing/` — blog index + `[...slug]` post page
- `src/content/writing/` — the posts
- `src/layouts/Base.astro` — shell, header/nav, footer, theme toggle
- `src/styles/global.css` — design tokens + base styles

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes on push to `main`.
In the repo: **Settings → Pages → Source: GitHub Actions.**

Configure `astro.config.mjs` for your setup:

- **Custom domain (peckenpaugh.us):** keep `site: 'https://peckenpaugh.us'`,
  no `base`. Add a `public/CNAME` file containing `peckenpaugh.us`, and point
  DNS at GitHub Pages.
- **User site (`<user>.github.io`):** set `site` to that URL, no `base`.
- **Project site (`<user>.github.io/<repo>`):** set `site` to the org URL and
  add `base: '/<repo>/'`.
