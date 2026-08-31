// A single source of truth for the app's colours. Dark wine + gold theme that
// matches the website, sitting on the FloralBackground. Every screen uses these
// tokens, so the whole app follows this palette.
// Exact palette from the website (apps/customer-web).
export const colors = {
  bg: '#1a0a14',          // page background
  surface: '#26101c',     // cards / inputs
  surfaceAlt: '#2e1522',  // selected rows, image fallbacks, progress tracks
  border: '#6b2140',      // wine card borders
  borderStrong: '#8a3a5c',// stronger borders (inputs)
  text: '#fdf1f5',        // near-white — primary text
  textMuted: '#cf9bb3',   // muted pink — secondary text
  primary: '#e85d8a',     // rose CTA
  primaryDark: '#b8336a', // wine
  gold: '#d4af37',        // prices / accents
  goldBright: '#f0c869',
  green: '#34d399',
  danger: '#f87171',
  headerBg: '#26101c',    // dark wine header
  headerText: '#fdf1f5',
  onPrimary: '#ffffff',
  chipBg: 'rgba(107,33,64,0.30)',
};

// Web fonts: Inter (body) + Outfit (display/headings).
export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Outfit_700Bold',
  displayBlack: 'Outfit_800ExtraBold',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
