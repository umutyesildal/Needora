// RowRun scenario, built on the real icp-scout run in data/rowrun/ (see its README).
// Rules the layout depends on are marked MUST; the page checks them on load and names the first broken one in the bottom bar.
//
// The posts are real people's words with the authors removed. Keep it that way: no invented names, photos,
// companies or linked profiles for these posts. The engine supports an optional `person` on a pick (see
// README), but only for fictional demo posts, never for real leads.

const COPY = {
  window: 'last 30 days',   // HUD: "Brief: RowRun · last 30 days"
  note: 'Posts are real RowRun leads with the authors removed, and they stay anonymous. The plan estimates, offers, sample rows and pages are illustrative.',
};

// RowRun's real plans (row.run/pricing, checked 24 Oct 2026). MUST be exactly 3. price = USD per month.
const PLANS = [
  { name:'Starter', price:20 },
  { name:'Team', price:200 },
  { name:'Business', price:800 },
];

// How each reply could be pitched. MUST be exactly 4.
const TONES = ['Expert', 'Friendly', 'Playful', 'Urgent'];

const OFFER_HOURS = 48;   // the timed discount is held this long from the first time a page opens

// The mentions on screen: the 30 top leads, as exported (id, sub, time, title, text, cat, score, …).
const POSTS = LEADS;

// What the brief rail says at each step (index 1–6).
const NOW = [
  null,
  ['Collect', `Needora read ${RUN.screened} public posts from the last 30 days across Reddit, Hacker News, LinkedIn and X. On screen: 30 of the ${RUN.matched} where someone describes a problem RowRun solves.`],
  ['Match', 'Every post is scored on fit, buying intent, ideal customer and whether a reply is welcome. These three scored highest where a reply is welcome.'],
  ['Plan', "The authors stay anonymous, so Needora estimates which RowRun plan fits from what each post says: row volume, team, tools and urgency."],
  ['Tone', 'Reddit punishes vendors who pitch. Needora reads each thread and picks how to answer so the reply gets read, not downvoted.'],
  ['Reply', 'Each reply answers the question first, says who we are, and links to a page made for that thread.'],
  ['Page', 'One link, one page, one offer: the routine they described, run on sample rows, with the RowRun plan that fits.'],
];

// The three best "worth a reply" leads. MUST be exactly 3.
//   post:      id of a lead in POSTS
//   name/tab:  how the anonymous author is referred to (status bar / browser tabs)
//   madeFor:   who the page addresses ("Made for …", "Price held for …")
//   need:      short label for the match pill
//   profiles:  [] for anonymous authors (step 3 then skips the profile lookup)
//   plan:      probs = % per PLANS entry, pick = index into PLANS, conf = %, signals = one line taken from the post
//   tone:      scores = 0–100 per TONES entry, pick = index into TONES, why = one line
//   reply:     under ~150 characters, keeps the disclosure; condensed from the reviewed draft in data/rowrun/leads.json
//   link:      slug (shown in the reply and address bar), title/desc/thumb for the link preview
//   offer:     ILLUSTRATIVE discount: pct off for `months` months; includes = lines from the real plan
//   page:      the step 6 page. run = a sample run table: cols, rows (3 are shown), pill = index of the column drawn as a status pill
const PICKS = [
  { post:335, name:'r/SalesOps author', tab:'r/SalesOps', madeFor:'the r/SalesOps thread', need:'Signal routing', profiles:[],
    plan:{ probs:[9, 33, 58], pick:2, conf:64, signals:'Already comparing Onfire, 6sense and Common Room · intent, scoring, tech changes and job posts per account · wants it routed into the CRM' },
    tone:{ scores:[88, 44, 5, 21], pick:0, why:'Strategy question in r/SalesOps while comparing vendors. Expects substance before any product mention.' },
    reply:"Work back from closed-won and route on signal combinations, not single signals. Disclosure: I'm on the RowRun team. Your routing rule on sample accounts:",
    link:{ slug:'row.run/for/signal-routing', title:'Route the signals your reps act on', desc:'Business plan · 25% off, held for 48 hours', thumb:'Signals routed, with a reason' },
    offer:{ pct:25, months:3, includes:['Up to 1,000,000 rows per run','Onboarding and a direct line to the founder','Unlimited members, builders and guests'] },
    page:{
      eyebrow:'For the r/SalesOps thread · signal routing',
      h1:'Route the signals your reps will act on.',
      sub:'Describe the rule once. RowRun checks every account for intent, job posts and tech changes, scores it with your weights, and routes it to the owner in your CRM with one line on why.',
      routine:'Every Monday, take accounts with a new signal. Check for an intent spike, a relevant job post or a tech change, and score them with our weights. Write one reason per account, route it to the owner in the CRM, and cap it at 25 per rep.',
      run:{ title:'Route accounts with new signals', total:248, unit:'accounts', pill:3, cols:['Account','Signals','Score','Route to','Reason'],
        rows:[
          ['Helio Logistics','Hiring 3 RevOps · intent spike','0.82','Lena · AE','Hiring RevOps and visited pricing twice'],
          ['Vantor Systems','Moved to HubSpot','0.74','Tim · AE','Switched CRM in September'],
          ['Nordwerk Software','Job post: Sales Ops','0.66','Lena · AE','New Sales Ops lead, 140 staff'],
          ['Brightfold','Intent spike only','0.41','Nurture','One signal, below the 0.6 bar'],
          ['Keller & Sohn','No signal in 90 days','0.12','Drop a tier','Quiet since July'],
        ] },
    } },
  { post:383, name:'r/hubspot author', tab:'r/hubspot', madeFor:'the r/hubspot thread', need:'HubSpot dedupe', profiles:[],
    plan:{ probs:[21, 64, 15], pick:1, conf:72, signals:"Buying for a client · 500–1,500 new duplicates a day, roughly 45k rows a month · already looking at Koalify" },
    tone:{ scores:[55, 38, 7, 86], pick:3, why:'"Gotten out of hand": up to 1,500 new duplicates a day, and choosing a tool now.' },
    reply:"Find where the dupes come from first, and never auto-merge fuzzy matches. Disclosure: I work on RowRun. Your client's dedupe, dry-run on sample contacts:",
    link:{ slug:'row.run/for/hubspot-dedupe', title:'Stop 1,500 HubSpot duplicates a day', desc:'Team plan · 30% off, held for 48 hours', thumb:'1,500 dupes a day, cleaned' },
    offer:{ pct:30, months:3, includes:['Up to 250,000 rows per run','Your client joins as a guest, free','Priority email support'] },
    page:{
      eyebrow:'For the r/hubspot thread · duplicate contacts',
      h1:'Clean 1,500 duplicates a day, without a risky merge.',
      sub:'RowRun matches each new contact against the portal by email, name and company domain, shows why, and merges only after someone approves. Then it runs every morning.',
      routine:'Every morning, take new HubSpot contacts. Match each one against existing contacts by email, normalised name and company domain. Propose a merge with the reason and the record that survives. Merge only after I approve, and flag anything ambiguous.',
      run:{ title:'Dedupe new HubSpot contacts', total:1284, unit:'contacts', pill:4, cols:['New contact','Matches','Reason','Confidence','Action'],
        rows:[
          ['joana.silva@acme.example','Joana Silva (2023)','Same email','100%','Merge'],
          ['J. Silva, Acme','joana.silva@acme.example','Name + company domain','86%','Review'],
          ['mark+news@brightco.example','mark@brightco.example','Email alias','97%','Merge'],
          ['info@tiles.example','Luso Tiles (company)','Shared inbox','—','Keep'],
          ['Ana Costa, Nova','Ana Costa, Nova Ltd','Name + company','71%','Review'],
        ] },
    } },
  { post:572, name:'r/CRM author', tab:'r/CRM', madeFor:'the r/CRM thread', need:'Finance admin', profiles:[],
    plan:{ probs:[72, 23, 5], pick:0, conf:80, signals:'Small renovation company · bank statements, invoices and supplier PDFs in Sheets and Drive · wants rules first, AI only where useful' },
    tone:{ scores:[43, 84, 14, 18], pick:1, why:'Small business owner with a long, careful post. Values reliability over hype.' },
    reply:"Sort the work by how rule-based it is: bank lines are rules, only supplier PDFs need AI. Disclosure: I work on RowRun. Your Movimentos routine, mapped out:",
    link:{ slug:'row.run/for/renovation-admin', title:'Every bank line matched, every week', desc:'Starter plan · 50% off, held for 48 hours', thumb:'Admin rules, run weekly' },
    offer:{ pct:50, months:3, includes:['Up to 25,000 rows per run','200,000 AI credits a month','Email support'] },
    page:{
      eyebrow:'For the r/CRM thread · renovation admin',
      h1:'Match every bank line and invoice. Keep AI for the PDFs.',
      sub:'Describe your rules once. RowRun classifies each bank line with your Configurações table, matches payments to invoices, reads supplier PDFs from Drive and writes to Movimentos after you approve.',
      routine:'Every Monday, import the XLSX bank statement. Classify each line with the rules in Configurações and match payments to invoices. Read new supplier PDFs from Drive. Write everything to Movimentos after I approve, and flag lines that match no rule.',
      run:{ title:'Match bank lines to Movimentos', total:312, unit:'lines', pill:4, cols:['Bank line','Amount','Category','Matched to','Status'],
        rows:[
          ['14 Oct · TRF Cerâmica Norte','−1,240.00','Materiais','Invoice CN-318','Matched'],
          ['15 Oct · MB WAY client payment','+3,500.00','Recebimento','Obra Foz · invoice 112','Matched'],
          ['15 Oct · Hardware store','−86.40','Materiais','Receipt PDF (AI read)','Check'],
          ['16 Oct · Electricity','−142.10','Utilities','Rule: counterparty','Matched'],
          ['17 Oct · TRF ref 5531','−910.00','—','No rule matched','Review'],
        ] },
    } },
];
