## Powered by [11ty](https://11ty.dev)

## Notes

- Post dates in `posts/*.md` front matter carry an explicit IST offset, e.g.
  `date: 2025-04-21 14:22:00 +05:30`. Always include `+05:30` — without it YAML
  treats the value as UTC, which shifts the rendered date by a day for any post
  published after 18:30 IST.
- Builds always render in IST: `.eleventy.js` sets `process.env.TZ = "Asia/Kolkata"`
  before any date is formatted, so `npm run build`, `npm start`, bare
  `npx @11ty/eleventy`, and CI all produce identical output on any machine.
- `npm run check` gates deploys on the sitemap: nothing live may disappear.
- `npm run visual` screenshots the built `_site` and compares it pixel-for-pixel
  against the live site (one post page + one tag page, desktop + mobile, ~8s).
  Use `-- --all` for every page, `-- --only /,/tag/AI/` for specific pages.
  Screenshots are written to a fresh directory under the OS temp dir and are
  never committed. Requires `npm run build` first, and a local Chrome
  (`playwright-core` ships no browser download; override with `CHROME_PATH`).
  A mismatching page is re-shot once before being reported, since tall
  full-page captures occasionally differ by a few antialiased pixels.
