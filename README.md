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
