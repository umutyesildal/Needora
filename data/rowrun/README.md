# RowRun posts data

Real posts from people who need [RowRun](https://row.run), found by icp-scout on
2026-10-24: it profiled row.run's ideal customer, searched Reddit (15
subreddits), Hacker News, X and LinkedIn for posts from 2026-09-25 to
2026-10-24, and had a model judge every post.

| file | rows | what |
|---|---|---|
| `posts.json` | 847 | every screened post, with the judge's answers and score |
| `leads.json` | 49 | the matches, with an excerpt, the need, how RowRun solves it and a reply draft |
| `run.json` | 1 | the product, its ideal customer, the scoring weights and the models used |

No author names or handles anywhere. Posts that did not match carry no text,
only where and when they were posted and how they were judged. Matches carry
the post's URL, title and the first 600 characters.

## Fields

Shared by `posts.json` and `leads.json`:

| field | meaning |
|---|---|
| `post_id` | id in icp-scout's database (stable across both files) |
| `platform` | `reddit`, `hackernews`, `twitter`, `linkedin` |
| `source` | `r/<subreddit>`, `HN story`, `HN comment`, `X`, `LinkedIn` |
| `created` | posted at, ISO 8601 UTC |
| `category` | Buying intent, Question, Pain point, Competitor mention, Discussion, Self-promo, Unrelated |
| `score` | 0–1 composite (see `run.json` for the weights) |
| `fit` | 0–4: how squarely the problem sits in what RowRun does |
| `intent` | 0–4: from no need (0) to ready to buy (4) |
| `icp` | `yes` / `maybe` / `no`: is the author someone RowRun sells to |
| `reply_welcome` | would a helpful reply from RowRun be appropriate there |
| `verdict` | `Worth a reply`, `Don't pitch`, `Not reviewed`, or `No match` (posts only) |

`posts.json` adds `match` (score ≥ threshold and not a vendor), `vendor` (the
author sells their own thing), `disqualified` (vendor, job ad or content drop),
`pitched` and `query` (the subreddit listing or search that found it).

`leads.json` adds `title`, `url`, `excerpt`, `need` (the author's problem in
one sentence), `why_match`, `solution` (how RowRun would solve that exact
case), `reply` (a draft, empty when no reply is recommended) and `notes` (what
to check before posting, or why not to pitch).

Verdicts: `Worth a reply` means a public reply is welcome. `Don't pitch` means
they need it but a pitch there would be unwelcome. `Not reviewed` means another
post by the same author ranked higher, or it fell outside the top 30.
