# i18n translation progress (resume here)

Goal: Magizhnaazh web apps (customer/vendor/admin) + mobile apps shown in 12 languages
(en + ta hi te ml kn bn mr gu pa or as). First-time sign-in/register asks for a language.

## How it works
- `node packages/shared-ui/i18n/scripts/extract.cjs`      → source-strings.json (all UI text from source)
- `node packages/shared-ui/i18n/scripts/prepare-work.cjs` → work/index.json + work/chunks/NN.txt (ids are STABLE; re-running only adds `add-*.txt` chunks for new strings)
- Translate each chunk into all 11 languages → `work/<lang>/NN.txt` (same file name as the chunk; lines `id | translation`)
- `node packages/shared-ui/i18n/scripts/build-locales.cjs` → validates + writes `locales/<lang>.json` (missing/invalid → app shows English for that string)
- Runtime: `runtime.ts` (DOM translator), `react.tsx` (LanguageModal/Gate/Button), wired in each app's main.tsx; first-time prompt in customer AuthModal.
- Read `work/GLOSSARY.md` before translating (rules + key-term table).

## Translation status (chunk → done languages)
- 01–14: all 11 languages done. 15: ta, hi, te done; ml kn bn mr gu pa or as TODO, then 16–19. Known issue: id 2165 "Type DELETE to confirm" reads badly because key "Type" is a noun; fix the source to one text node.
(next: 02 … 19 — chunks are in discovery order: customer strings first, then vendor, admin, server messages)

## Still TODO after translations
- Vendor + admin: LanguageButton in header next to ThemeToggle; LanguageGate in vendor AuthGate + admin AuthGate
- Server: auth-service user.language field + PUT /api/v1/auth/language; register accepts `language`; apps call saveLanguageToAccount after login/register
- Mobile (apps/mobile, apps/vendor-mobile): native LoginScreen language step + translated native strings (AsyncStorage `magizhnaazh_lang`), WebApp injects localStorage `magizhnaazh_lang`, handle `{type:'language'}` message from web
- Run browser check per language for missing strings: switch language, browse, `__i18n.missing()` → add to extra-strings.json → extract → prepare-work (adds chunk) → translate
- Commit + push; note limits (Urdu/RTL not included; place names: states + top cities only)
