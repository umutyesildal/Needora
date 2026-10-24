// The presenter: the company running every demo (the shell around the stage: intro curtain, HUD, brief rail, dock).
// Shared by all demos. Each demo's client (whose leads are scouted, and whose voice the replies use) lives in config/<demo>/.
const PRESENTER = {
  name: 'Needora',
  tagline: 'Find the people who need what you build.',            // intro curtain
  lockupWhite: 'assets/brand/logos/needora-lockup-white-crop.svg', // intro curtain, on the accent colour
  lockupBlack: 'assets/brand/logos/needora-lockup-black-crop.svg', // HUD and the client page footer
};

// Presenter colours and font (see brand.md). The client's own look is set in config/<demo>/client.js.
const THEME = {
  accent: '#7C1010',       // curtain, highlights, glow, crawl lines, primary button
  accentHover: '#5E0B0B',
  accentSoft: '#F6ECEC',
  ink: '#000000',
  muted: '#625D5B',
  bg: '#F4F3F2',
  dot: '#DCD8D6',
  line: '#E2DEDC',
  surface: '#FFFFFF',
  font: 'Rubik',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap',
};
