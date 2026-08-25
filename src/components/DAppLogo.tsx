import React from 'react';

interface DAppLogoProps {
  className?: string;
}

export default function DAppLogo({ className = "h-10 w-auto" }: DAppLogoProps) {
  return (
    <svg 
      viewBox="0 0 250 110" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        {/* Cyan to Blue gradient for the logo mark */}
        <linearGradient id="dAppIconGrad" x1="10" y1="10" x2="110" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        
        {/* Cutout Mask for making the inner D transparent */}
        <mask id="dCutout">
          {/* Everything white is kept */}
          <rect x="0" y="0" width="120" height="110" fill="white" />
          {/* Everything black is cut out */}
          <path 
            d="M 52 32 
               H 64 
               C 76 32, 82 38, 82 50 
               C 82 62, 76 68, 64 68 
               H 52 
               V 32 Z" 
            fill="black" 
          />
        </mask>
      </defs>

      {/* STYLIZED "D" ICON */}
      <g transform="translate(10, 10)">
        {/* Main Curved 'D' Shape with Mask */}
        <path 
          d="M 32 12 
             H 68 
             C 94 12, 108 26, 108 50 
             C 108 74, 94 88, 68 88 
             H 32 
             V 12 Z" 
          fill="url(#dAppIconGrad)" 
          mask="url(#dCutout)"
        />
        
        {/* Floating Digital Pixel Blocks (representing tech / nodes / apps) */}
        <rect x="5" y="18" width="16" height="16" rx="4" fill="#00F0FF" className="animate-pulse" />
        <rect x="14" y="42" width="12" height="12" rx="3" fill="#38BDF8" />
        <rect x="4" y="66" width="16" height="16" rx="4" fill="#2563EB" />
        <rect x="16" y="86" width="10" height="10" rx="2.5" fill="#1D4ED8" />
      </g>

      {/* TYPOGRAPHY "App" sitting perfectly next to the 'D' icon */}
      <text 
        x="130" 
        y="70" 
        fill="#38BDF8" 
        fontSize="56" 
        fontWeight="900" 
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        letterSpacing="-1.5px"
      >
        App
      </text>
    </svg>
  );
}
