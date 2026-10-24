// Social platforms a found profile can belong to (PICKS[].profiles in scenario.js).
// Add an entry here before using a new platform key there. glyph is 1–3 characters drawn on a coloured tile.
const PLATFORMS = {
  x:           { label:'X',             color:'#0F1419', glyph:'X' },
  linkedin:    { label:'LinkedIn',      color:'#0A66C2', glyph:'in' },
  instagram:   { label:'Instagram',     color:'#D62976', glyph:'IG' },
  web:         { label:'Website',       color:'#4B5563', glyph:'www' },
  reddit:      { label:'Reddit',        color:'#FF4500', glyph:'r/' },
  youtube:     { label:'YouTube',       color:'#FF0000', glyph:'▶' },
  facebook:    { label:'Facebook',      color:'#1877F2', glyph:'f' },
  substack:    { label:'Substack',      color:'#FF6719', glyph:'S' },
  threads:     { label:'Threads',       color:'#101010', glyph:'@' },
  bluesky:     { label:'Bluesky',       color:'#1185FE', glyph:'b' },
  podcast:     { label:'Podcast',       color:'#8A3FFC', glyph:'))' },
  github:      { label:'GitHub',        color:'#1F2328', glyph:'GH' },
  producthunt: { label:'Product Hunt',  color:'#DA552F', glyph:'P' },
  indiehackers:{ label:'Indie Hackers', color:'#0E2439', glyph:'IH' },
};
