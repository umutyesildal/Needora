// The story the demo tells: the mentions found, the 3 best-fit people, and what we send each of them.
// Edit freely. Rules the layout depends on are marked MUST; the page checks them on load and
// shows the first broken rule in the bottom bar instead of running.

// Text around the demo.
const COPY = {
  product: 'Mention Scout',             // HUD title and browser tab title (prefixed with BRAND.name)
  scope: 'X + Reddit · last 7 days',    // small caps next to the title
  sources: 'X and Reddit',              // used in "Scanning X and Reddit…"
  offerEnds: '7 November 2026',         // footer of every tailored page
};

// Pricing tiers. MUST be exactly 3 (the plan panel has 3 rows). price is per month, in dollars.
const PLANS = [{ name:'Starter', price:29 }, { name:'Growth', price:99 }, { name:'Scale', price:299 }];

// Reply tones. MUST be exactly 4 (the tone panel has 4 rows).
const TONES = ['Serious', 'Friendly', 'Funny', 'Urgent'];

// Every mention shown in the grid (about 20–36 reads well).
//   X post:      { kind:'x', name, handle, photo, time, text, replies, reposts, likes }
//   Reddit post: { kind:'r', sub, user, time, title, text, ups, comments }
//   id: only needed on posts a PICK points at.
//   photo: a file name in assets/faces/ without .jpg ('f14'), or any image path/URL. Leave out for initials.
// Faces in assets/faces/ are AI-generated (no real person).
const POSTS = [
  { kind:'x', name:'Priya Raman', handle:'priyabuilds', photo:'f14', time:'2h', text:"Third time this month a client 'forgot' to pay an invoice. I'm a designer, not a debt collector.", replies:14, reposts:6, likes:212 },
  { kind:'x', name:'Marcus Bell', handle:'marcusbell_', photo:'f2', time:'5h', text:'Our support inbox hit 400 unread this morning. We are 3 people. Please send coffee.', replies:31, reposts:9, likes:388 },
  { kind:'x', name:'Hannah Cho', handle:'hannahcho', photo:'f15', time:'1d', text:"Is there a tool that doesn't need a PhD to set up? Asking for my entire ops team.", replies:22, reposts:3, likes:97 },
  { id:'dev', kind:'x', name:'Dev Patel', handle:'devpatel_ops', photo:'f6', time:'3h', text:'Spent my entire Sunday copying order data between Shopify and our spreadsheet. Again. There has to be a better way than this.', replies:48, reposts:17, likes:641 },
  { kind:'x', name:'Lena Fischer', handle:'lenafischer', photo:'f10', time:'6h', text:"Hot take: if your onboarding needs a 45 minute call, your onboarding is broken. (Yes, I'm talking about us.)", replies:19, reposts:24, likes:530 },
  { kind:'x', name:'Tom Okoye', handle:'tomokoye', photo:'f18', time:'8h', text:"We lost a 20k deal because the follow-up email sat in someone's drafts for two weeks. Cool cool cool.", replies:12, reposts:4, likes:176 },
  { kind:'x', name:'Sara Lindqvist', handle:'saralind', photo:'f16', time:'1d', text:'Every Monday: export CSV, clean CSV, paste CSV, pray. Repeat until retirement.', replies:9, reposts:11, likes:302 },
  { kind:'x', name:'Jamie Ortiz', handle:'jamieortiz', photo:'f12', time:'4h', text:"Our 'CRM' is a shared Google Sheet with 14 tabs and one person who understands it. She's on vacation.", replies:27, reposts:15, likes:455 },
  { kind:'x', name:'Nora Brooks', handle:'norabrooks', photo:'f8', time:'9h', text:"Customers keep asking where their order is and honestly? I also don't know.", replies:6, reposts:2, likes:84 },
  { kind:'x', name:'Aisha Bello', handle:'aishabello', photo:'f7', time:'2d', text:'Scheduling 6 contractors across 3 sites over WhatsApp should count as cardio.', replies:11, reposts:5, likes:143 },
  { kind:'x', name:'Chris Wu', handle:'chriswu', photo:'f17', time:'7h', text:'Renewed a tool we stopped using 8 months ago. Nobody noticed until a card got declined somewhere else.', replies:8, reposts:3, likes:120 },
  { id:'maya', kind:'x', name:'Maya Okafor', handle:'mayaokafor', photo:'f1', time:'1h', text:"Our month-end close takes 9 days because half our invoices live in someone's inbox. The finance team is running on fumes.", replies:36, reposts:12, likes:497 },
  { kind:'x', name:'Beth Harris', handle:'bethharris', photo:'f9', time:'3h', text:'Tried to get one number out of our reporting stack. It gave me three different answers.', replies:15, reposts:7, likes:231 },
  { kind:'x', name:'Olivia Grant', handle:'oliviagrant', photo:'f19', time:'1d', text:'Week 3 of manually tagging every support ticket. My wrists have opinions.', replies:5, reposts:1, likes:66 },
  { kind:'x', name:'Leo Martins', handle:'leomartins', photo:'f11', time:'5h', text:'Does anyone else spend more time updating the status doc than doing the work in it?', replies:40, reposts:8, likes:367 },
  { kind:'r', sub:'smallbusiness', user:'coastal_candles', time:'6h', title:'How do you all keep track of who owes you money?', text:"About 40 wholesale accounts and I'm tracking payments in my notes app. I know. I know.", ups:214, comments:87 },
  { kind:'r', sub:'sysadmin', user:'patchtuesday_survivor', time:'1d', title:'Is it normal for onboarding a new hire to take 2 full days of setup?', text:'Accounts, laptops, permissions, 11 different tools. Feels like there is a better way.', ups:532, comments:203 },
  { kind:'r', sub:'ecommerce', user:'thrift_flip_co', time:'4h', title:'Inventory counts never match between our site and the warehouse', text:'We oversold 30 units last week. Customers were not happy.', ups:96, comments:41 },
  { kind:'r', sub:'startups', user:'foundermode_tired', time:'9h', title:'At what point did you stop doing support yourself?', text:"I answer about 80 tickets a day and haven't written code in a month.", ups:341, comments:156 },
  { kind:'r', sub:'Accounting', user:'debits_and_doubts', time:'2d', title:'Clients send receipts as phone photos at 11pm. Every. Single. Time.', text:'Matching them to transactions takes me longer than the actual bookkeeping.', ups:788, comments:264 },
  { kind:'r', sub:'projectmanagement', user:'gantt_or_bust', time:'7h', title:'Our team uses 4 different tools to track the same project', text:"Jira, Asana, a spreadsheet, and Dave's memory. Dave is the most reliable.", ups:173, comments:58 },
  { kind:'r', sub:'freelance', user:'pixel_and_pine', time:'3h', title:'Lost a client because I double-booked two calls', text:'My calendar, their calendar, and my booking link all disagreed.', ups:64, comments:29 },
  { id:'rachel', kind:'r', sub:'SaaS', user:'rachel_ships', time:'2h', title:"We're losing trial users and I can't tell where they drop off", text:'Signups are fine. Activation is a mystery. Our analytics setup is three half-configured tools.', ups:289, comments:112 },
  { kind:'r', sub:'restaurateur', user:'two_burners', time:'1d', title:'Staff scheduling is eating my whole Sunday', text:'Shift swaps over text, no-shows, and I find out at 6am.', ups:121, comments:47 },
  { kind:'r', sub:'marketing', user:'ctr_or_die', time:'5h', title:'Reporting takes me longer than the campaigns do', text:'Pulling numbers from 6 ad platforms into slides every single week.', ups:402, comments:133 },
  { kind:'r', sub:'msp', user:'ticket_goblin', time:'8h', title:'Clients email, call, and text about the same issue', text:'Three tickets, one problem, zero context.', ups:57, comments:22 },
  { kind:'r', sub:'Entrepreneur', user:'bootstrapped_bea', time:'1d', title:'Churn is creeping up and I only find out at renewal', text:'Would love an early warning. Right now my early warning is the cancellation email.', ups:233, comments:91 },
  { kind:'r', sub:'realestate', user:'listing_lucas', time:'6h', title:'Leads come in from 5 portals and half go cold before I see them', text:"By the time I call back they've signed with someone else.", ups:88, comments:36 },
  { kind:'r', sub:'humanresources', user:'hr_on_fire', time:'2d', title:'Still chasing managers for performance reviews in week 6', text:'Reminder emails are not working. Neither am I, apparently.', ups:146, comments:52 },
  { kind:'r', sub:'shopify', user:'glow_goods', time:'3h', title:'Returns are a nightmare to process manually', text:'Print label, email customer, update sheet, refund, restock. 40 times a week.', ups:198, comments:77 },
];

// The 3 best fits, in rank order. MUST be exactly 3 (the demo lays them out in 3 columns).
//   post:     the id of a post in POSTS
//   photo:    same rules as POSTS[].photo
//   profiles: 1–6 rows of [platform key from config/platforms.js, handle, detail, optional photo]
//   plan:     probs = % per PLANS entry (same order), pick = index into PLANS, conf = confidence %, signals = one line
//   tone:     scores = 0–100 per TONES entry (same order), pick = index into TONES, why = one line
//   reply:    keep under ~150 characters, it is typed into a 3-line box followed by link.url
//   link:     url without https://, the host part is shown on its own; title/desc/thumb fill the link preview card
//   page:     the tailored landing page that opens in step 6.
//             delta = [[before value, label], [after value, label]]; steps = exactly 3 [title, text] rows
const PICKS = [
  { post:'dev', name:'Dev Patel', photo:'f6', fit:'96% fit · Manual data entry', fitShort:'96% fit',
    profiles:[
      ['linkedin','Dev Patel','Head of Ops, Kettle & Crumb','f6'],
      ['instagram','@kettleandcrumb','18.4k followers · bakery'],
      ['web','kettleandcrumb.com','Shopify store · 3 locations'],
      ['reddit','u/devops_baker','Active in r/shopify'],
      ['youtube','Kettle & Crumb','2.1k subscribers'],
      ['facebook','Kettle & Crumb Bakery','Leeds, UK · 4.8 rating'],
    ],
    plan:{ probs:[22, 61, 17], pick:1, conf:81, signals:'Head of Ops · 3 store locations · Shopify revenue · team of ~15 · posts about the problem weekly' },
    tone:{ scores:[24, 58, 82, 31], pick:2, why:'Self-deprecating post, big casual audience, replies to him are playful' },
    reply:"Sundays are for sourdough, not spreadsheets. We built you a page showing how all 3 stores can sync themselves, first month on us:",
    link:{ url:'needora.com/kettle-crumb', title:'Kettle & Crumb: orders that sync themselves', desc:'Growth plan · first month free + setup this week', thumb:'Get your Sundays back' },
    page:{
      company:'Kettle & Crumb', eyebrow:'For Dev Patel · Kettle & Crumb, Leeds',
      h1:'Dev, get your Sundays back.',
      sub:'Orders from all three Kettle & Crumb Shopify stores land in your spreadsheet on their own, every five minutes. No more copying, no more Sunday catch-up.',
      delta:[['6 hrs','every Sunday'], ['0 hrs','after week one']],
      steps:[
        ['Connect Shopify','Sign in once. We pick up all 3 stores and your full order history.'],
        ['Point us at your sheet','Keep the spreadsheet your team already knows. Same columns, same tabs.'],
        ['Orders sync on their own','New orders, refunds and stock levels update every 5 minutes.'],
      ],
      cadence:'per month', deal:'First month free, and we do the setup with you this week.',
      includes:['Up to 5 Shopify stores','Unlimited orders and products','Google Sheets and Excel sync','Refund and stock updates','Setup call with an engineer'],
      why:"You run ops for 3 locations on Shopify with a team of about 15. Growth covers every store with room for a fourth, without paying for finance features you don't need.",
      chips:['3 Shopify stores','~15 staff','Head of Ops','Weekly manual export'],
      cta:'Claim my free month', cta2:'Book 15 minutes',
    } },
  { post:'maya', name:'Maya Okafor', photo:'f1', fit:'93% fit · Invoice backlog', fitShort:'93% fit',
    profiles:[
      ['linkedin','Maya Okafor','Finance Director, Northwind Freight','f1'],
      ['substack','The Close','Newsletter · 1.2k readers'],
      ['web','northwindfreight.com','Logistics · ~120 staff'],
      ['threads','@mayaokafor','Posts weekly about month-end','f1'],
      ['bluesky','@maya.bsky.social','Finance ops threads'],
      ['podcast','Finance Ops Weekly','Guest · Ep. 84'],
    ],
    plan:{ probs:[6, 24, 70], pick:2, conf:77, signals:'Finance Director · ~120 staff · budget owner · 9-day close costs a whole team · speaks on industry podcasts' },
    tone:{ scores:[86, 41, 8, 47], pick:0, why:'Senior finance role, team under real pressure, professional B2B audience' },
    reply:"A 9-day close usually means invoices stuck in inboxes. We put together how Northwind could close in 4, with a 30-day pilot for your AP team:",
    link:{ url:'needora.com/northwind-close', title:'Northwind Freight: a 4-day month-end close', desc:'Scale plan · 30-day pilot with your AP team', thumb:'Close in 4 days, not 9' },
    page:{
      company:'Northwind Freight', eyebrow:'For Maya Okafor · Northwind Freight',
      h1:'Close the books in 4 days, not 9.',
      sub:'Invoices stop living in inboxes. Every one is captured, matched to its PO and routed for approval, so your team closes on day 4.',
      delta:[['9 days','month-end close'], ['4 days','with Needora']],
      steps:[
        ['Forward the AP inbox','Every invoice PDF is read and logged within minutes, with supplier, amount and due date.'],
        ['Auto-match to POs','Line items are matched to purchase orders and receipts. Your team only sees the exceptions.'],
        ['Approve and close','Approvals go to the right manager, then post straight to your ledger.'],
      ],
      cadence:'per month, billed yearly', deal:'30-day pilot with your AP team, led by a dedicated onboarding lead.',
      includes:['Unlimited invoices and suppliers','PO and receipt matching','Approval workflows','Up to 150 seats','SOC 2 Type II and full audit trail','Dedicated onboarding lead'],
      why:'Northwind has around 120 staff and you own the finance budget. Scale is the only plan with PO matching and audit trails, which is what turns 9 days into 4.',
      chips:['~120 staff','Finance Director','Budget owner','Freight & logistics'],
      cta:'Start the 30-day pilot', cta2:'See a sample close',
    } },
  { post:'rachel', name:'Rachel Kim', photo:'f20', fit:'91% fit · Activation analytics', fitShort:'91% fit',
    profiles:[
      ['x','@rachelkim_ships','3.4k followers · founder','f20'],
      ['linkedin','Rachel Kim','Co-founder, Loopwise','f20'],
      ['github','rkim','42 repos · TypeScript'],
      ['producthunt','Loopwise','Launched · #4 of the day'],
      ['web','loopwise.io','B2B SaaS · seed stage'],
      ['indiehackers','rachelk','Shares MRR updates'],
    ],
    plan:{ probs:[68, 27, 5], pick:0, conf:84, signals:'Seed-stage founder · shares MRR publicly (~$8k) · price-sensitive · will upgrade as usage grows' },
    tone:{ scores:[38, 49, 11, 88], pick:3, why:'Losing trial users right now, asked publicly for help, founder on a deadline' },
    reply:"Most trials drop in the first session. We mapped out how you'd see the exact step Loopwise users quit by tomorrow, free under 1k users:",
    link:{ url:'needora.com/loopwise', title:'Loopwise: see where trials drop off', desc:'Starter plan · free until 1k monthly users', thumb:'Find the step trials quit' },
    page:{
      company:'Loopwise', eyebrow:'For Rachel Kim · Loopwise',
      h1:'See exactly where Loopwise trials quit.',
      sub:"One snippet, and by tomorrow you'll see every step of your trial funnel with the exact screen where people leave. No new analytics stack.",
      delta:[['3 tools','half-configured'], ['1 snippet','10 minutes to set up']],
      steps:[
        ['Add one snippet','Paste it into your app, or install the npm package. About 10 minutes.'],
        ['See the funnel','Signup to activation, step by step, with the drop-off rate for every screen.'],
        ['Watch the drop-offs','Replays of the sessions where people quit, plus a Slack alert when a step gets worse.'],
      ],
      cadence:'per month', deal:'Free until you pass 1,000 monthly users. No card needed.',
      includes:['Funnels and drop-off by step','Session replays of drop-offs','Slack alerts','Up to 10k monthly users','Cancel anytime'],
      why:'Loopwise is seed-stage at around $8k MRR. Starter fixes the activation problem now, and it grows with you when usage does.',
      chips:['Seed stage','~$8k MRR','Founder','TypeScript stack'],
      cta:'Connect Loopwise', cta2:'Read the docs',
    } },
];
