'use client';

import { useId } from 'react';

/** Concept A — Equator: full iso skeleton; equals cuts the mid-plane across the front. */
export function ParityMarkConceptA({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const grad = `parity-a-grad-${uid}`;

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
        <linearGradient id={grad} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" stopOpacity="0.95" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Top face */}
      <path
        d="M24 8 L37 16 L24 24 L11 16 Z"
        stroke={`url(#${grad})`}
        strokeWidth="1.35"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* Left face */}
      <path
        d="M11 16 L24 24 L24 40 L11 32 Z"
        stroke={`url(#${grad})`}
        strokeWidth="1.35"
        strokeLinejoin="round"
        opacity="0.75"
      />
      {/* Right face */}
      <path
        d="M24 24 L37 16 L37 32 L24 40 Z"
        stroke={`url(#${grad})`}
        strokeWidth="1.35"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Dice pips — top face diagonal + left face */}
      <circle cx="18" cy="13" r="1.85" fill="#34d399" />
      <circle cx="30" cy="19" r="1.85" fill="#34d399" />
      <circle cx="15" cy="21" r="1.85" fill="#34d399" opacity="0.85" />

      {/* Equals — equator slice */}
      <path
        d="M13 27.5 H35 M13 31.5 H35"
        stroke="#eef0f3"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.92"
      />
      <path
        d="M13 27.5 H35 M13 31.5 H35"
        stroke={`url(#${grad})`}
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
