import React from 'react';

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="soulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" /> {/* orange-500 */}
          <stop offset="50%" stopColor="#ec4899" /> {/* pink-500 */}
          <stop offset="100%" stopColor="#e11d48" /> {/* rose-600 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Outer abstract shape representing the soul/sync */}
      <path 
        d="M50 15 C 20 15, 15 40, 35 60 C 50 75, 50 85, 50 85 C 50 85, 50 75, 65 60 C 85 40, 80 15, 50 15 Z" 
        stroke="url(#soulGradient)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
        filter="url(#glow)"
      />
      
      {/* Inner sync/infinity loop */}
      <path 
        d="M40 45 C 30 45, 30 55, 40 55 C 50 55, 50 45, 60 45 C 70 45, 70 55, 60 55 C 50 55, 50 45, 40 45 Z" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Sparkle/Star */}
      <path 
        d="M50 25 L 52 32 L 59 34 L 52 36 L 50 43 L 48 36 L 41 34 L 48 32 Z" 
        fill="white" 
      />
    </svg>
  );
}
