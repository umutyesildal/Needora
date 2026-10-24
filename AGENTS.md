# Notes for coding agents

- Read `README.md` first. The "Customizing" and "Rules the layout depends on" sections are the contract.
- To re-skin or re-target the demo, edit only `config/*.js` and add files under `assets/`. Don't put content back into `index.html`.
- Keep the config files as classic scripts that declare globals (`const BRAND = …`). Don't convert them to ES modules or JSON loaded with `fetch`, because both break when `index.html` is opened from disk.
- After editing, open the page and step through all 6 steps. If the bottom bar says `Config: …`, a rule was broken.
- Faces in `assets/faces/` are AI-generated. Never use photos of real people without consent.
