/** Shared Tailwind class constants for the FaceCart design system. */

// ---- Buttons ----
export const BTN_PRIMARY =
  'w-full py-5 bg-brand-500 text-white rounded-full text-lg font-semibold ' +
  'hover:bg-brand-600 active:press disabled:bg-sand disabled:text-muted ' +
  'disabled:cursor-not-allowed transition-all duration-200';

export const BTN_SECONDARY =
  'w-full py-4 bg-beige text-ink rounded-full text-base font-medium ' +
  'hover:bg-sand active:press transition-all duration-200';

export const BTN_OUTLINE =
  'px-5 py-3 border border-sand text-muted rounded-full text-base font-medium ' +
  'hover:bg-beige hover:text-ink active:press transition-all duration-200';

export const BTN_GHOST =
  'text-base text-muted hover:text-ink transition-colors';

export const BTN_DANGER_TEXT =
  'text-base text-rose-500 hover:text-rose-700 transition-colors';

// ---- Cards ----
export const CARD =
  'bg-beige rounded-3xl p-8 shadow-card';

export const CARD_WHITE =
  'bg-white rounded-2xl p-8 shadow-card';

// ---- Inputs ----
export const INPUT =
  'w-full px-5 py-4 bg-beige border border-sand rounded-2xl ' +
  'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 ' +
  'text-lg text-ink placeholder:text-muted/60 transition-colors';

export const TEXTAREA =
  INPUT + ' resize-none';

export const SELECT =
  INPUT;

// ---- Typography ----
export const LABEL =
  'block text-base font-medium text-ink mb-2';

export const SECTION_LABEL =
  'text-sm text-muted uppercase tracking-wider font-medium';

export const BODY =
  'text-lg text-ink leading-relaxed';

export const BODY_MUTED =
  'text-lg text-muted leading-relaxed';

export const DISCLAIMER =
  'text-sm text-muted text-center';

// ---- Tags / Chips ----
export const TAG =
  'px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium';

export const TAG_WARNING =
  'px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium';

// ---- Layout ----
export const PAGE =
  'min-h-screen bg-cream animate-fade-in';

export const PAGE_CENTER =
  'min-h-screen bg-cream flex flex-col items-center justify-center p-6 animate-fade-in';
