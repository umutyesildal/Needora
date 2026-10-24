# Mention Scout

An animated, click-through demo of Needora turning social listening into sales for a client. It screens public posts, picks the 3 best fits where a reply is welcome, estimates which of the client's plans each would buy, picks how to answer, writes the reply in the client's voice, and opens a page made for that thread, with a timed offer and the routine run on sample rows.

Needora is the presenter: the intro curtain, the HUD, the brief rail with the funnel, and the dock. The client is whoever the leads are scouted for. That's RowRun today, using the 30 top real leads from its icp-scout run in `data/rowrun/`. The authors stay anonymous.

It's a static page with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000. Use **Next** (or →/Space) to step through, **R** to restart, and **Esc** to close the page. `?demo=<name>` picks a client from `config/<name>/`. Without it, the page shows `rowrun`.

## Before your first commit

Run this once in your clone:

```bash
git config core.hooksPath .githooks
```

The `commit-msg` hook in `.githooks/` removes `Co-authored-by:` lines and "Generated with …" footers, so only the people on the team show up as contributors. When you squash-merge a pull request on GitHub, delete any `Co-authored-by:` lines GitHub adds to the merge message too.

## Layout

```
index.html            the engine: layout, styles, 3D scene, animation. No content lives here.
config/
  presenter.js        PRESENTER (Needora name, tagline, logos) and THEME (shell colours, font). Shared by all demos
  platforms.js        PLATFORMS: label, colour and glyph per social network. Shared by all demos
  rowrun/             one folder per client demo
    client.js         CLIENT (name, Reddit handle and flair, colours, font, logos, brief text) and DATA_FILES
    scenario.js       COPY, PLANS, TONES, OFFER_HOURS, POSTS, NOW (brief rail text per step) and PICKS
assets/
  brand/logos/        Needora logos; see brand.md. The page uses the cropped white and black lockups
  brand/fonts/        Rubik font download
  faces/              f1–f20.jpg, AI-generated portraits (no real people), for fictional demo posts only
brand.md              Needora brand guide (colours, type, logo use)
data/rowrun/          real, anonymised leads for RowRun from icp-scout (see its README), plus:
  leads.js            the top 30 leads and run stats as page-ready globals (LEADS, RUN)
  logos/              RowRun logos
```

## Customizing (for people and agents)

Everything you'd want to change is in `config/`. Those are plain JS files loaded with `<script src>`, so the page still works when opened straight from disk. Edit the values, keep the shape, and reload.

**New client.** Copy `config/rowrun/` to `config/<name>/` (lowercase letters, digits and dashes), put the client's logos and lead export in `data/<name>/`, and open `index.html?demo=<name>`.
- In `client.js`, set `CLIENT`: name, the Reddit handle and flair the replies come from, the colours (`color` for buttons and links, `deep` for prices and the countdown, `soft` for tints), the page font, the logos and the brief rail text.
- `DATA_FILES` lists scripts that load before `scenario.js`. The engine needs a `RUN` object for the funnel and the brief: `screened`, `matched`, `reply`, `sources`, `weights` and `exported`. See `data/rowrun/leads.js` for the shape.

**New mentions.** `POSTS` in `scenario.js` is the list of leads on screen. Each lead needs `id`, `sub`, `time`, `title`, `text`, `cat` (the category chip) and `score` (0–1). The RowRun demo uses the export as-is (`const POSTS = LEADS`). About 20–36 posts fill the grid well.

**New best fits.** Each of the 3 `PICKS` points at a lead through `post: <id>`. It holds everything shown for that thread: the plan estimate, the tone scores, the reply, the link preview, the offer, and the page with its routine and sample run table. The comments above `PICKS` in `config/rowrun/scenario.js` describe every field. The easiest way to add a pick is to copy an existing one and rewrite it.

**Anonymous by default.** Real leads have no author. Leave `profiles: []` and the demo skips the profile lookup, shows "Author anonymised", and addresses the page with `madeFor` (for example "the r/hubspot thread"). The engine can also show a person, via an optional `person: { name, handle, role, company, photo }` and up to 6 `profiles` per pick. Use that only for fictional demo posts with faces from `assets/faces/`, never for real leads.

**New pricing, tones or offer.** Edit `PLANS`, `TONES` and `OFFER_HOURS`. Each pick's `plan.probs` and `tone.scores` list one number per entry, in the same order, and `pick` is a 0-based index into those lists. `offer.pct` and `offer.months` set the discount shown on the page.

**New platform for a profile.** Add a key to `config/platforms.js`, then use that key in `PICKS[].profiles`.

**New presenter.** Edit `config/presenter.js` to change the name, tagline, logos and shell colours.

**RowRun specifics.** The plan prices and the "includes" lines come from row.run/pricing (checked 24 Oct 2026). The discounts and the 48-hour hold are illustrative. Each reply is a condensed version of the reviewed draft in `data/rowrun/leads.json` and keeps its disclosure. Read that draft's `notes` before reusing a reply anywhere real. The sample run rows on each page are made-up example data.

### Rules the layout depends on

The page checks these on load. If one is broken, the page doesn't start, and the bottom bar names the problem.

- exactly **3** `PLANS`, **4** `TONES` and **3** `PICKS`, and a `NOW` entry for each of the 6 steps
- each `PICKS[].post` matches the `id` of a lead in `POSTS`
- each pick has a `profiles` list (it can be empty) with at most **6** entries, each using a key from `PLATFORMS`
- each `page.run` has at least **3** sample rows (3 are shown)
- the demo's data file defines `RUN`

Text that runs long gets cut with "…" instead of overflowing. The places most likely to clip are `reply` (keep it under about 155 characters), `plan.signals` and `tone.why` (two lines each), and `link.title`/`link.desc`.

## Changing the engine

`index.html` is organised in commented sections: `config` (loading, checks, applying colours and text), `constants`, `images`, `canvas drawing` (one function per panel type), `three setup`, `tweens`, `layout`, `build scene`, `render loop`, `UI: dock, steps, brief`, `step 6: the page made for each person`, `steps` (`step1`–`step6`, one per HUD step) and `boot`. CSS classes starting with `rr-` style the client page. They take their colours and font from `CLIENT`. The engine uses Three.js 0.160 from jsDelivr. Changing the counts above means changing the panel drawing functions (`drawPlan`, `drawTone`) and the column layout (`colPos`, `step2`).
