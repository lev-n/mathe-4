/**
 * Inline SVG icons (no external assets). Colours come from CSS (currentColor / classes), never hard-coded.
 * Decorative icons are aria-hidden; the visible text next to them carries the meaning.
 */
import type { ComponentType } from 'react';
import type { TopicId } from '../../core/types';

/** App logo mark: a rounded tile with a drawn "4". */
export function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="40" height="40" aria-hidden="true" focusable="false">
      <rect className="logo-mark__bg" x="0" y="0" width="64" height="64" rx="16" />
      <path className="logo-mark__fg" d="M37 12 14 38h34M37 12v40" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_PROPS = {
  viewBox: '0 0 48 48',
  width: 48,
  height: 48,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

function ZahlenIcon() {
  return (
    <svg {...ICON_PROPS}>
      {/* Hunderterplatte, Zehnerstange, Einer */}
      <rect x="5" y="6" width="18" height="18" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M11 6v18M17 6v18M5 12h18M5 18h18" strokeWidth="1.5" />
      <rect x="27" y="6" width="6" height="18" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M27 12h6M27 18h6" strokeWidth="1.5" />
      <rect x="37" y="6" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="37" y="15" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      {/* Zahlenstrahl */}
      <path d="M4 37h40M6 33v8M15 34.5v5M24 33v8M33 34.5v5M42 33v8" />
    </svg>
  );
}

function SchriftlichIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 15h8M11 11v8" />
      <rect x="20" y="5" width="7" height="8" rx="1.5" />
      <rect x="30" y="5" width="7" height="8" rx="1.5" />
      <rect x="40" y="5" width="5" height="8" rx="1.5" />
      <rect x="20" y="17" width="7" height="8" rx="1.5" />
      <rect x="30" y="17" width="7" height="8" rx="1.5" />
      <rect x="40" y="17" width="5" height="8" rx="1.5" />
      <path d="M6 30h40" strokeWidth="3" />
      <rect x="20" y="34" width="7" height="8" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="30" y="34" width="7" height="8" rx="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="40" y="34" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function KopfrechnenIcon() {
  const dots = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={8 + c * 10 + (c >= 2 ? 4 : 0)} cy={9 + r * 10} r="3.2" fill="currentColor" stroke="none" />);
    }
  }
  return (
    <svg {...ICON_PROPS}>
      {dots}
      <path d="M26 4v40" strokeDasharray="3 3" strokeWidth="2" />
    </svg>
  );
}

function GroessenIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="24" cy="15" r="11" fill="currentColor" fillOpacity="0.12" />
      <path d="M24 8v7l5 3" />
      <rect x="4" y="31" width="40" height="12" rx="2" />
      <path d="M9 31v5M14 31v3M19 31v5M24 31v3M29 31v5M34 31v3M39 31v5" strokeWidth="2" />
    </svg>
  );
}

function GeometrieIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M22 5 L33 23 H11 Z" fill="currentColor" fillOpacity="0.15" />
      <rect x="6" y="27" width="16" height="16" rx="1.5" />
      <circle cx="35" cy="34" r="9" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function DatenIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M7 5v36h36" />
      <rect x="12" y="25" width="7" height="16" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="23" y="12" width="7" height="29" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="34" y="19" width="7" height="22" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function SachaufgabenIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M17 19 L22 7 M31 19 L26 7" />
      <path d="M5 19h38l-5 22H10z" fill="currentColor" fillOpacity="0.15" />
      <path d="M17 25v10M24 25v10M31 25v10" strokeWidth="2" />
    </svg>
  );
}

const TOPIC_ICONS: Record<TopicId, ComponentType> = {
  zahlen: ZahlenIcon,
  schriftlich: SchriftlichIcon,
  kopfrechnen: KopfrechnenIcon,
  groessen: GroessenIcon,
  geometrie: GeometrieIcon,
  daten: DatenIcon,
  sachaufgaben: SachaufgabenIcon,
};

/** Decorative topic icon; colour comes from the surrounding `.topic--<id>` accent. */
export function TopicIcon({ topicId }: { topicId: TopicId }) {
  const Icon = TOPIC_ICONS[topicId];
  return <Icon />;
}

const STAR_PATH = 'M12 2.6l2.85 5.95 6.55.8-4.8 4.55 1.22 6.5L12 17.25l-5.82 3.15 1.22-6.5-4.8-4.55 6.55-.8z';

export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={filled ? 'star star--on' : 'star star--off'} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={STAR_PATH} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Generic small icons used next to text labels. */
export function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
    </svg>
  );
}

export function PrintIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function BoltIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  );
}

/** Navigation icons (top app bar): outlined, 24 px; the current page tints the inside (app.css). */
const NAV_ICON_PROPS = {
  className: 'site-nav__icon',
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function HomeIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" />
    </svg>
  );
}

export function ProgressIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-5h3v5zM13 16V7h3v9z" />
    </svg>
  );
}

export function SheetIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

export function AdultsIcon() {
  return (
    <svg {...NAV_ICON_PROPS}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20z" />
      <path d="M16 15.5h1.5a3.5 3.5 0 0 1 3.5 3.5v1h-4" />
    </svg>
  );
}
