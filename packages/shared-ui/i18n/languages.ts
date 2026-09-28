// The languages the apps can be shown in. Adding one = add a row here, then
// create locales/<code>.json (see scripts/build-locales.cjs).
//
// All are left-to-right scripts. Right-to-left languages (Urdu, Arabic) are
// deliberately not included: they need layout mirroring on every screen.

export type LangCode = 'en' | 'hi' | 'ta' | 'te' | 'ml' | 'kn' | 'bn' | 'mr' | 'gu' | 'pa' | 'or' | 'as';

export interface Language {
  code: LangCode;
  name: string;       // English name
  nativeName: string; // written in the language itself — what people look for
  font?: string;      // Google Fonts family that covers the script
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', font: 'Noto Sans Tamil' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', font: 'Noto Sans Devanagari' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', font: 'Noto Sans Telugu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', font: 'Noto Sans Malayalam' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', font: 'Noto Sans Kannada' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', font: 'Noto Sans Bengali' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', font: 'Noto Sans Devanagari' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', font: 'Noto Sans Gujarati' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', font: 'Noto Sans Gurmukhi' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', font: 'Noto Sans Oriya' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', font: 'Noto Sans Bengali' },
];

export const DEFAULT_LANGUAGE: LangCode = 'en';

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === 'string' && LANGUAGES.some((l) => l.code === v);
}
