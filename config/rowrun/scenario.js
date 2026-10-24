// RowRun scenario, built from the real icp-scout run in data/rowrun/ (see its README).
// Same rules as config/needora/scenario.js. The differences:
//   - POSTS are generated from LEADS (data/rowrun/leads.js), not written by hand.
//   - Authors are anonymised in the data, so posts have no `user` and picks have no `profiles` or `photo`.
//     Don't invent names or profiles for these posts: they're real people.
//   - Cards show the judge's category and score as `tags`, because the export has no vote counts.
//   - Each pick's reply, need and solution are condensed from the reviewed drafts in data/rowrun/leads.json.

const COPY = {
  product: 'Mention Scout',
  scope: 'Reddit · 15 subreddits · last 30 days',
  sources: 'Reddit',
  found: `${LEADS.length} top leads from ${RUN.matched} matches in ${RUN.screened} posts screened`,
  offerEnds: '7 November 2026',
};

// PLACEHOLDER pricing: RowRun's real plans and prices weren't in the data. Replace before showing this to anyone.
const PLANS = [{ name:'Starter', price:49 }, { name:'Team', price:199 }, { name:'Business', price:599 }];

const TONES = ['Serious', 'Friendly', 'Funny', 'Urgent'];

// leads.js cuts post text at 260 characters, so mark the cut
const POSTS = LEADS.map(l => ({
  id: 'lead' + l.id, kind: 'r', sub: l.sub, time: l.time, title: l.title,
  text: l.text.length >= 255 ? l.text.trimEnd() + '…' : l.text,
  tags: [l.cat, `score ${l.score.toFixed(2)}`],
}));

const PICKS = [
  { post:'lead335', name:'r/SalesOps poster', tab:'r/SalesOps', fit:'Score 0.84 · Signal routing', fitShort:'Score 0.84',
    profiles: [],
    plan:{ probs:[18, 64, 18], pick:1, conf:72, signals:'Sales ops role · already comparing Onfire, 6sense and Common Room · routes accounts into a CRM' },
    tone:{ scores:[82, 51, 6, 33], pick:0, why:'Thoughtful question to practitioners, asks for process advice, no jokes in the thread' },
    reply:"Route on combinations of signals, not single ones, and test the rule on last week's accounts first. Disclosure: I work on RowRun.",
    link:{ url:'row.run/signal-routing', title:'Route the signals that matter into your CRM', desc:"Team plan · test run on last week's accounts", thumb:'Signals in, routed rows out' },
    page:{
      company:'your sales team', madeFor:'the r/SalesOps thread', eyebrow:'For the r/SalesOps thread · signal routing',
      h1:'Stop letting intent signals sit in dashboards.',
      sub:"Describe your routing rule in plain words. RowRun checks every new account against it, writes one reason per account, and routes it to the right owner, after you approve.",
      delta:[['Dashboards','reps never open'], ['1 reason','per routed account']],
      steps:[
        ['Describe the rule','For example: new account with an intent spike plus a relevant job post, scored and routed to its owner.'],
        ['Test on last week',"Every account gets a result with its sources. Nothing is written to the CRM or sent to Slack yet."],
        ['Approve, then schedule','It runs on a schedule. Change the rule by saying what should differ.'],
      ],
      cadence:'per month', deal:"Free test run on last week's accounts. Nothing writes to your CRM until you approve.",
      includes:['Signals from CSV, Sheets, REST APIs or web search','Deterministic scoring and routing','AI only for judgement calls','HubSpot or Salesforce write-back after approval','Runs on a schedule'],
      why:"RowRun doesn't supply intent data, so it won't replace Onfire, 6sense or Common Room. It's the routing layer on top: Team covers one CRM and a weekly run on every new account.",
      chips:['Intent data in place','Comparing Onfire / 6sense','CRM routing','Wants low admin'],
      cta:"Test on last week's accounts", cta2:'See an example run',
    } },
  { post:'lead383', name:'r/hubspot poster', tab:'r/hubspot', fit:'Score 0.82 · Duplicate contacts', fitShort:'Score 0.82',
    profiles: [],
    plan:{ probs:[8, 36, 56], pick:2, conf:68, signals:"Consultant for a client · 500–1,500 new duplicate contacts a day · already evaluating Koalify" },
    tone:{ scores:[64, 40, 4, 86], pick:3, why:'Volume is out of hand, already shopping for a fix, the client is waiting' },
    reply:"At 1,500 dupes a day, fix the sources too. Exact-email merges are safe to automate; review the fuzzy ones. Disclosure: I work on RowRun.",
    link:{ url:'row.run/hubspot-dedupe', title:'Dedupe 1,500 HubSpot contacts a day, with review', desc:"Business plan · dry run on last week's contacts", thumb:'Merges you approve first' },
    page:{
      company:"your client's HubSpot", madeFor:'the r/hubspot thread', eyebrow:'For the r/hubspot thread · duplicate contacts',
      h1:'Clear 1,500 duplicates a day without merging blind.',
      sub:"Every new contact is matched against existing ones by email, name and company domain. You see each proposed merge with its reason, and nothing merges until someone approves.",
      delta:[['500–1,500','new dupes a day'], ['0','merged without review']],
      steps:[
        ['Connect HubSpot','Read-only to start. RowRun looks at new contacts daily or as they arrive.'],
        ['Describe the match rule','Exact email merges automatically. Fuzzy name and company matches go to review.'],
        ['Approve, then schedule','A dry run on last week shows every merge and why. Then it runs daily and flags failed rows.'],
      ],
      cadence:'per month', deal:"Dry run on last week's contacts, with every proposed merge and its reason.",
      includes:['Daily or on-arrival dedupe runs','Deterministic matching on email, name and domain','AI only for ambiguous pairs','Merges only after approval','Retries and flags failed rows'],
      why:"At this volume the Business plan covers daily runs with review. RowRun won't stop duplicates being created by forms or imports, so fixing those sources is a separate job.",
      chips:['Consultant','500–1,500 dupes a day','HubSpot','Evaluating Koalify'],
      cta:'Start the dry run', cta2:'See a sample merge report',
    } },
  { post:'lead6', name:'r/salesforce poster', tab:'r/salesforce', fit:'Score 0.78 · Fake inbound leads', fitShort:'Score 0.78',
    profiles: [],
    plan:{ probs:[28, 60, 12], pick:1, conf:70, signals:'Runs inbound lead scoring in Salesforce · fakes get past duplicate rules · two months of skewed scores' },
    tone:{ scores:[57, 79, 18, 41], pick:1, why:'Shared what they figured out, peer-to-peer thread, frustrated but curious' },
    reply:"Completeness is the easiest thing for a bot to fake; cross-checks catch them. Disclosure: I work on RowRun. Here's a check you could run:",
    link:{ url:'row.run/fake-lead-check', title:'Catch fake leads before they reach scoring', desc:"Team plan · test on the last few weeks of leads", thumb:'Real leads only' },
    page:{
      company:'your inbound funnel', madeFor:'the r/salesforce thread', eyebrow:'For the r/salesforce thread · fake inbound leads',
      h1:'Catch fake leads before they reach your scoring.',
      sub:"Each new form lead gets cheap checks first: email, domain, area code, repeat patterns. Suspects get a status, not a delete, so you can see what was flagged and why.",
      delta:[['2 months','of skewed lead scores'], ['Every lead','checked before scoring']],
      steps:[
        ['Point it at new leads','New inbound form leads in Salesforce, checked as they arrive.'],
        ['Cheap checks first','Email validity, domain age and mail server, name vs email, area code vs location.'],
        ['Flag, don\'t delete','Suspected fakes get a status after you approve, and stay out of scoring until reviewed.'],
      ],
      cadence:'per month', deal:'Test it on the last few weeks of leads before it writes anything to Salesforce.',
      includes:['Checks on every new lead','Deterministic email, domain and phone checks','Optional web lookup for the hard cases','A verdict per lead with sources','Writes a status only after approval'],
      why:"Team covers one Salesforce org and every inbound lead. RowRun won't fix the scoring model itself, so you'd still stop rewarding form completeness there.",
      chips:['Salesforce','Inbound forms','Lead scoring','Fakes pass dupe rules'],
      cta:'Test on recent leads', cta2:'See the checks',
    } },
];
