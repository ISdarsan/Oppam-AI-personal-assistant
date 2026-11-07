import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = false, className = '' }) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Scalable SVG Emblem */}
      <div className={`${sizeMap[size]} flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-emerald-700/30`}>
        <svg viewBox="0 0 512 512" fill="none" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="logoKoodBg" x1="64" y1="32" x2="448" y2="480" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1B4332"/>
              <stop offset="50%" stopColor="#2D6A4F"/>
              <stop offset="100%" stopColor="#143626"/>
            </linearGradient>
            <linearGradient id="logoWarmSun" x1="256" y1="120" x2="256" y2="340" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FCD34D"/>
              <stop offset="100%" stopColor="#F59E0B"/>
            </linearGradient>
            <linearGradient id="logoHandsGrad" x1="160" y1="200" x2="352" y2="420" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E8F5E9"/>
              <stop offset="100%" stopColor="#C7E8D6"/>
            </linearGradient>
            <radialGradient id="logoAuraGlow" cx="50%" cy="45%" r="45%">
              <stop offset="0%" stopColor="#52B788" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#1B4332" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Squircle Base */}
          <rect width="512" height="512" rx="128" fill="url(#logoKoodBg)"/>
          <rect x="4" y="4" width="504" height="504" rx="124" stroke="#52B788" strokeWidth="6" strokeOpacity="0.4"/>

          {/* Soft Aura & Inner Halo */}
          <circle cx="256" cy="235" r="185" fill="url(#logoAuraGlow)"/>
          <circle cx="256" cy="235" r="150" fill="#FFFFFF" fillOpacity="0.06" stroke="#52B788" strokeWidth="3" strokeDasharray="10 8" strokeOpacity="0.5"/>

          {/* Golden Heart & Care Sun */}
          <path d="M256 142 C240 114 200 110 178 132 C154 156 156 194 186 226 C214 256 256 294 256 294 C256 294 298 256 326 226 C356 194 358 156 334 132 C312 110 272 114 256 142 Z" 
                fill="url(#logoWarmSun)"/>
          <circle cx="256" cy="180" r="18" fill="#FFFBEB"/>

          {/* Caring Hands Embracing */}
          <path d="M128 350 C140 280 180 230 224 235 C232 236 236 244 232 252 C216 280 188 320 188 360 C188 395 215 410 240 415 C215 425 180 422 155 400 C134 382 124 365 128 350 Z" 
                fill="url(#logoHandsGrad)"/>
          <path d="M384 350 C372 280 332 230 288 235 C280 236 276 244 280 252 C296 280 324 320 324 360 C324 395 297 410 272 415 C297 425 332 422 357 400 C378 382 388 365 384 350 Z" 
                fill="url(#logoHandsGrad)"/>
          <path d="M185 385 C220 425 292 425 327 385 C310 405 275 418 256 418 C237 418 202 405 185 385 Z" 
                fill="#A7D7C5"/>

          {/* Gentle Smile Curve & Companionship Dots */}
          <g transform="translate(256, 315) scale(0.95)">
            <path d="M-60 10 C-30 45 30 45 60 10" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round"/>
            <circle cx="-38" cy="-5" r="9" fill="#FFFFFF"/>
            <circle cx="38" cy="-5" r="9" fill="#FFFFFF"/>
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">Oppam</span>
            <span className="text-base sm:text-lg font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">ഒപ്പം</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-emerald-800/80">Always by your side • എന്നും കൂടെയുണ്ട്</span>
        </div>
      )}
    </div>
  );
};
