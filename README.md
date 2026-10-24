# Needora Mention Scout

An animated, click-through demo of social listening turned into sales: it scans X and Reddit for people describing a problem, picks the 3 best fits, finds their other profiles, estimates which plan they'd buy, picks a reply tone, writes the reply, and opens the landing page made for each of them.

It's one static page with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000. Use **Next** (or →/Space) to step through, **R** to restart, and **Esc** to close the page.

## Layout

```
index.html            the engine: layout, styles, 3D scene, animation. No content lives here.
config/
  brand.js            BRAND (name, handles, logo paths) and THEME (colours, font)
  scenario.js         COPY, PLANS, TONES, POSTS (the mentions) and PICKS (the 3 best fits)
  platforms.js        PLATFORMS: label, colour and glyph per social network
assets/
  brand/logos/        Needora logos; see brand.md. The page uses the cropped lockup and mark files
  brand/fonts/        Rubik font download
  faces/              f1–f20.jpg, AI-generated portraits (no real people), used as profile photos
brand.md              Needora brand guide (colours, type, logo use)
data/rowrun/          real, anonymised leads for RowRun from icp-scout (see its README), plus:
  leads.js            the top 30 leads trimmed into a page-ready global (LEADS, RUN). Not wired in yet:
                      source material for a RowRun version of the demo
  logos/              RowRun logos
```

## Customizing (for people and agents)

Everything you'd want to change is in `config/`. Those are plain JS files loaded with `<script src>`, so the page still works when opened straight from disk. Edit the values, keep the shape, and reload.

**New brand.** In `config/brand.js`, set `BRAND` (name, X handle, Reddit username, domain) and point `lockup`/`mark` at your logo files in `assets/brand/`. Then set `THEME`. `accent` drives every highlight in the page and the 3D scene. Keep `accentHover`, `accentSoft` and `accentDeep` as darker, lighter and near-black versions of it. `font` is any Google Fonts family, and `fontUrl` is its stylesheet link.

**New mentions.** Replace `POSTS` in `config/scenario.js`. There are two shapes:

```js
{ kind:'x', name:'Dev Patel', handle:'devpatel_ops', photo:'f6', time:'3h', text:'…', replies:48, reposts:17, likes:641 }
{ kind:'r', sub:'SaaS', user:'rachel_ships', time:'2h', title:'…', text:'…', ups:289, comments:112 }
```

About 20–36 posts fill the grid well. `photo` is a face id from `assets/faces/` (`'f6'`), or any image path or URL. Leave it out and the post shows initials.

**New best fits.** Each of the 3 `PICKS` points at a post through `post: '<id>'`, so give that post an `id`. Each pick then holds everything shown about that person: linked `profiles`, the `plan` estimate, the `tone` scores, the `reply` text, the `link` preview and the full tailored `page`. The comments above `PICKS` in `scenario.js` describe every field. The easiest way to add a new pick is to copy an existing one and rewrite it.

**New pricing or tones.** Edit `PLANS` and `TONES`. Each pick's `plan.probs` and `tone.scores` list one number per entry, in the same order. `pick` is a 0-based index into those lists.

**New platform for a profile.** Add a key to `config/platforms.js`, then use that key in `PICKS[].profiles`.

### Rules the layout depends on

The page checks these on load. If one is broken, the page doesn't start, and the bottom bar names the problem.

- exactly **3** `PLANS`, **4** `TONES` and **3** `PICKS`
- each `PICKS[].post` matches the `id` of a post in `POSTS`
- each pick has at most **6** `profiles`, each using a key from `PLATFORMS`
- each `page.steps` has exactly **3** rows
- `post.kind` is `'x'` or `'r'`

Text that runs long gets cut with "…" instead of overflowing. The places most likely to clip are `reply` (keep it under about 150 characters), `plan.signals` and `tone.why` (one line each), and `link.title`/`link.desc`.

## Changing the engine

`index.html` is organised in commented sections: `config` (loading and checks), `constants`, `photos`, `canvas drawing` (one function per panel type), `three setup`, `layout`, `build scene`, `render loop`, `step 6: tailored page`, `steps` (`step1`–`step6`, one per HUD step) and `boot`. It uses Three.js 0.160 from jsDelivr. Changing the counts above means changing the panel drawing functions (`drawPlan`, `drawTone`) and the column layout (`colPos`, `step2`).
