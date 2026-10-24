// Who is doing the scouting: the brand that replies to posts and owns the tailored pages.
// Swap these values to re-skin the whole demo for another company. Paths are relative to index.html.
const BRAND = {
  name: 'Needora',              // shown as the reply author and in the page footer
  handle: 'needora',            // X handle, without @
  reddit: 'Needora',            // Reddit username, without u/
  domain: 'needora.com',        // reference only: each pick's full link lives in PICKS[].link.url (scenario.js)
  lockup: 'assets/brand/logos/needora-lockup-black-crop.svg',  // full logo, dark, for light backgrounds (HUD + page nav)
  mark: 'assets/brand/logos/needora-mark-white-crop.svg',      // symbol only, white, drawn on an accent-coloured disc as the avatar
};

// Colours and font. Every colour in the page and the 3D canvas comes from here.
const THEME = {
  accent: '#7C1010',       // brand colour: buttons, highlights, reply avatar, glow
  accentHover: '#5E0B0B',  // darker accent for button hover
  accentSoft: '#F6ECEC',   // very light accent for tinted backgrounds
  accentDeep: '#2A0505',   // near-black accent, end of the link-preview gradient
  ink: '#000000',          // main text
  muted: '#625D5B',        // secondary text
  bg: '#F4F3F2',           // page background
  dot: '#DCD8D6',          // background dot grid
  line: '#E2DEDC',         // borders
  surface: '#FFFFFF',      // cards and panels
  font: 'Rubik',           // any Google Font family name
  fontUrl: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap',
};
