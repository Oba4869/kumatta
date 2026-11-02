// Inline SVG icons (ported from the prototype). All use currentColor so they follow the theme.
import type { JSX } from 'react';

export const PIC: Record<string, JSX.Element> = {
  wind: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/></svg>
  ),
  rabbit: (
    <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><ellipse cx="17" cy="29" rx="11" ry="8"/><circle cx="26" cy="21" r="6"/><ellipse cx="24.5" cy="9" rx="2.4" ry="7"/><ellipse cx="29" cy="10" rx="2.4" ry="7"/></svg>
  ),
  bird: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M3 12q4.5-5 9 0q4.5-5 9 0"/></svg>
  ),
  bear: (
    <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><circle cx="11" cy="10" r="5"/><circle cx="29" cy="10" r="5"/><circle cx="20" cy="20" r="13"/><rect x="7" y="26" width="26" height="12" rx="6"/></svg>
  ),
  cub: (
    <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><circle cx="11" cy="10" r="5"/><circle cx="29" cy="10" r="5"/><circle cx="20" cy="20" r="13"/><rect x="7" y="26" width="26" height="12" rx="6"/></svg>
  ),
  tanuki: (
    <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><ellipse cx="16" cy="27" rx="13" ry="9"/><circle cx="27" cy="18" r="8"/><circle cx="23" cy="10" r="3"/><circle cx="31" cy="10" r="3"/><ellipse cx="4" cy="27" rx="5" ry="4"/></svg>
  ),
  boar: (
    <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><ellipse cx="17" cy="23" rx="14" ry="10"/><ellipse cx="31" cy="23" rx="7" ry="6"/><rect x="9" y="30" width="4" height="6"/><rect x="21" y="30" width="4" height="6"/><path d="M33 27q3-1 4-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  wolf: (
    <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true" fill="currentColor"><ellipse cx="17" cy="24" rx="12" ry="7"/><path d="M24 20L28 8L31 15L38 18L35 23L26 25Z"/><rect x="9" y="28" width="3" height="9"/><rect x="21" y="28" width="3" height="9"/><path d="M6 22Q0 18 1 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
  ),
  mother: (
    <svg width="34" height="34" viewBox="0 0 48 40" aria-hidden="true" fill="currentColor"><circle cx="9" cy="10" r="5"/><circle cx="27" cy="10" r="5"/><circle cx="18" cy="20" r="12"/><rect x="5" y="26" width="26" height="12" rx="6"/><circle cx="36" cy="25" r="2.5"/><circle cx="45" cy="25" r="2.5"/><circle cx="40.5" cy="30" r="6"/><rect x="34" y="33" width="13" height="5" rx="2.5"/></svg>
  ),
  lock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
  ),
};

export const TOOL_ICON: Record<string, JSX.Element> = {
  bell: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
  ),
  radio: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8l9-5"/><circle cx="15" cy="14" r="3"/><path d="M6 12h3M6 16h3"/></svg>
  ),
  spray: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="8" width="8" height="13" rx="2"/><path d="M9 8V5h4v3M13 5h3M19 4v.01M19 7v.01M21 5.5v.01"/></svg>
  ),
  pack: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 8a5 5 0 0 1 10 0v12H7z"/><path d="M9 5V3h6v2M7 13h10M10 13v3h4v-3"/></svg>
  ),
  helmet: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 16a9 9 0 0 1 18 0z"/><path d="M12 7v9M7.5 9.5l2 6.5M16.5 9.5l-2 6.5M2 16h20"/></svg>
  ),
};

export const COND_ICON: Record<string, JSX.Element> = {
  calm: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  ),
  stream: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 8q2.5-2 5 0t5 0 5 0 5 0M2 13q2.5-2 5 0t5 0 5 0 5 0M2 18q2.5-2 5 0t5 0 5 0 5 0"/></svg>
  ),
  wind: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h7"/></svg>
  ),
  fog: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M2 11h12M8 15h14M4 19h12"/></svg>
  ),
  dusk: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 16a7 7 0 0 1 14 0M2 16h20M12 4v3M4.9 8.9l1.4 1.4M19.1 8.9l-1.4 1.4M6 20h12"/></svg>
  ),
  hokkaido: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7.3 11l1.7 1.5L10.6 11"/></svg>
  ),
};

export const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
);

/** Bear medal: a big bear face with eyes and muzzle cut out. */
export const MedalIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(0 -1)"><circle cx="5.6" cy="6.4" r="3.4" fill="currentColor"/><circle cx="18.4" cy="6.4" r="3.4" fill="currentColor"/><path fill="currentColor" fillRule="evenodd" d="M3.5 13.5a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0Z M7.8 11.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z M13.6 11.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z M8.7 16.2a3.3 2.5 0 1 0 6.6 0a3.3 2.5 0 1 0 -6.6 0Z"/><circle cx="12" cy="15.5" r="1.15" fill="currentColor"/></g></svg>
);
