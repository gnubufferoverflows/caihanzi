import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="strokeGradient" x1="20" y1="30" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7f1d1d" />   {/* red-900 */}
          <stop offset="50%" stopColor="#dc2626" />  {/* red-600 */}
          <stop offset="100%" stopColor="#fca5a5" /> {/* red-300 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Abstract representation of the character "文" (Culture/Script) or a creative Hanzi form */}
      
      {/* Top Dot (Dian) - Solid Dark */}
      <path 
        d="M50 15 C 50 15, 55 25, 45 28 C 40 29, 42 18, 50 15" 
        fill="#450a0a" 
      />

      {/* Horizontal Stroke (Heng) - Dark Red */}
      <path 
        d="M25 35 C 25 35, 75 30, 80 38" 
        stroke="#7f1d1d" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />

      {/* Left Falling Curve (Pie) - Medium Red */}
      <path 
        d="M50 35 Q 45 60 20 75" 
        stroke="#b91c1c" 
        strokeWidth="7" 
        strokeLinecap="round" 
      />

      {/* Right Sweeping Curve (Na) - The "Colorful" Gradient Stroke */}
      <path 
        d="M50 35 Q 65 65 90 85" 
        stroke="url(#strokeGradient)" 
        strokeWidth="8" 
        strokeLinecap="round"
        className="drop-shadow-sm"
      />
    </svg>
  );
};

export default Logo;