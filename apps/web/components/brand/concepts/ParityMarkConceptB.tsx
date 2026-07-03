'use client';

import { useId } from 'react';

/** Concept B — Meridian: equals is the structural spine; cube edges frame above and below. */
export function ParityMarkConceptB({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const grad = `parity-b-grad-${uid}`;

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
        <linearGradient id={grad} x1="6" y1="12" x2="42" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>

      {/* Upper skeleton */}
      <path
        d="M24 7 L38 15 L38 23 M24 7 L10 15 L10 23 M24 7 V15"
        stroke={`url(#${grad})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M10 15 L24 23 L38 15"
        stroke={`url(#${grad})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Equals — central spine */}
      <path
        d="M8 26 H40 M8 30 H40"
        stroke="#eef0f3"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <path
        d="M8 26 H40 M8 30 H40"
        stroke={`url(#${grad})`}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Lower skeleton */}
      <path
        d="M10 33 L10 40 L24 46 M38 33 L38 40 L24 46 M10 33 L24 40 L38 33"
        stroke={`url(#${grad})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}
