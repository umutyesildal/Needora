# Notes for coding agents

- Read `README.md` first. The "Customizing" and "Rules the layout depends on" sections are the contract.
- To re-target the demo, edit only `config/` and add files under `assets/` or `data/<demo>/`. Don't put content back into `index.html`. For a new client, copy `config/rowrun/` and open `index.html?demo=<name>`.
- Keep the config files as classic scripts that declare globals (`const CLIENT = …`). Don't convert them to ES modules or JSON loaded with `fetch`, because both break when `index.html` is opened from disk.
- After editing, open the page (with `?demo=<name>`) and step through all 6 steps. If the bottom bar says `Config: …`, a rule was broken.
- Faces in `assets/faces/` are AI-generated. Never use photos of real people without consent.
- Only people are contributors here. Never add `Co-authored-by` lines or "Generated with …" footers for AI tools to commits or PR descriptions. Each clone should run `git config core.hooksPath .githooks` once; the hook in `.githooks/` strips them.
- Lead data from real posts (like `data/rowrun/`) is anonymised. Keep it that way: no invented names, photos, companies or linked profiles for those authors (`person` and `profiles` are for fictional posts only), and replies must keep their disclosure.

## Needora app (Next.js)

- The Next.js app (`app/`, `lib/`, `db/`) is the Needora product built from `docs/specs/0001-foundation-core-lead-loop/index.md`. Mention Scout (`index.html`, `config/`) is a separate static demo; don't mix them.
- The UI must match `docs/design/needora-dashboard.dc.html`. Scope and specs live in `docs/scope/` and `docs/specs/`.
- Secrets live only in `.env.local` (`DATABASE_URL`, `APIFY_API_TOKEN`, `OPENAI_API_KEY`) and are read on the server only.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
