'use client';

import { useId } from 'react';

/** Concept C — Hollow: airy corner skeleton; soft equals floats in negative space. */
export function ParityMarkConceptC({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const grad = `parity-c-grad-${uid}`;
  const fade = `parity-c-fade-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={grad} x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id={fade} x1="12" y1="28" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eef0f3" stopOpacity="0" />
          <stop offset="0.15" stopColor="#eef0f3" stopOpacity="0.95" />
          <stop offset="0.85" stopColor="#eef0f3" stopOpacity="0.95" />
          <stop offset="1" stopColor="#eef0f3" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Corner skeleton — 8 vertices, selective edges */}
      <path
        d="M24 9 L35 15 L35 27 M24 9 L13 15 L13 27 M24 9 V17"
        stroke={`url(#${grad})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M13 33 L13 39 L24 45 M35 33 L35 39 L24 45"
        stroke={`url(#${grad})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M13 15 L24 21 L35 15 M13 27 L24 33 L35 27"
        stroke={`url(#${grad})`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* Soft equals — fades at tips */}
      <path
        d="M14 27.5 H34 M14 31.5 H34"
        stroke={`url(#${fade})`}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
