// RowRun: the client this demo scouts for. Its voice writes the replies, and its look styles the step 6 page.
// Open with index.html?demo=rowrun (it's also the default). Paths are relative to index.html.
const CLIENT = {
  name: 'RowRun',
  handle: 'rowrun_team',          // Reddit username the replies come from, without u/
  flair: 'RowRun team',           // flair shown next to that username, so every reply discloses who wrote it
  domain: 'row.run',              // shown on link previews
  color: '#005FFF',               // RowRun blue: buttons, links, offer border
  deep: '#13004E',                // RowRun navy: prices, discount tag, countdown
  soft: '#EEF4FF',                // light tint: tick marks, "ok" pills
  font: 'Inter',                  // page font for step 6 (any Google Font)
  fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap',
  logo: 'data/rowrun/logos/rowrun-logo.svg',              // full logo for light backgrounds
  mark: 'data/rowrun/logos/rowrun-mark.svg',              // blue symbol: Reddit avatar
  markWhite: 'data/rowrun/logos/rowrun-mark-white.svg',   // white symbol: intro curtain, link preview
  about: 'Your AI automation engineer. Sales and ops teams describe a weekly routine in plain words, and RowRun runs it on every row.',
  chips: ['B2B, 10–500 staff', 'Sales · RevOps · finance', 'DACH first', 'Zapier flows breaking', 'Manual weekly routines'],
};

// Loaded after this file and before scenario.js: the icp-scout export as LEADS and RUN.
const DATA_FILES = ['data/rowrun/leads.js'];
