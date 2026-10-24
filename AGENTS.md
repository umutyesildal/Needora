# Notes for coding agents

- Read `README.md` first. The "Customizing" and "Rules the layout depends on" sections are the contract.
- To re-skin or re-target a demo, edit only `config/<demo>/*.js` and add files under `assets/` or `data/<demo>/`. Don't put content back into `index.html`. For a new company, copy a demo folder and open `index.html?demo=<name>`.
- Keep the config files as classic scripts that declare globals (`const BRAND = …`). Don't convert them to ES modules or JSON loaded with `fetch`, because both break when `index.html` is opened from disk.
- After editing, open the page (with `?demo=<name>`) and step through all 6 steps. If the bottom bar says `Config: …`, a rule was broken.
- Faces in `assets/faces/` are AI-generated. Never use photos of real people without consent.
- Only people are contributors here. Never add `Co-authored-by` lines or "Generated with …" footers for AI tools to commits or PR descriptions. Each clone should run `git config core.hooksPath .githooks` once; the hook in `.githooks/` strips them.
- Lead data from real posts (like `data/rowrun/`) is anonymised. Keep it that way: no invented names, photos or linked profiles for those authors, and replies must keep their disclosure.
