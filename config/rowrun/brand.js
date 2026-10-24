// RowRun version of the demo: index.html?demo=rowrun
// Same shape as config/needora/brand.js. Paths are relative to index.html.
const BRAND = {
  name: 'RowRun',
  handle: 'rowrun',             // X handle, without @ (all RowRun leads are from Reddit, so this isn't shown)
  reddit: 'RowRun',             // Reddit username the replies are shown from, without u/
  domain: 'row.run',            // reference only: each pick's full link lives in PICKS[].link.url (scenario.js)
  lockup: 'data/rowrun/logos/rowrun-logo.svg',        // full logo, blue + navy, for light backgrounds
  mark: 'data/rowrun/logos/rowrun-mark-white.svg',    // symbol only, white, drawn on an accent-coloured disc
};

// Loaded after this file and before scenario.js, which builds POSTS from them (LEADS, RUN).
const DATA_FILES = ['data/rowrun/leads.js'];

// Colours from the RowRun logo: blue #005FFF, navy #13004E.
const THEME = {
  accent: '#005FFF',
  accentHover: '#004BCC',
  accentSoft: '#E8F0FF',
  accentDeep: '#13004E',
  ink: '#0B0B1A',
  muted: '#5B6475',
  bg: '#F3F5F9',
  dot: '#D8DEE9',
  line: '#DDE2EA',
  surface: '#FFFFFF',
  font: 'Inter',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap',
};
