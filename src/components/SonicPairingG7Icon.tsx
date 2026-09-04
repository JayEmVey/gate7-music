import React from 'react';

interface SonicPairingG7IconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  showRipples?: boolean;
  showSteam?: boolean;
  className?: string;
  badgeText?: string;
}

export const SonicPairingG7Icon: React.FC<SonicPairingG7IconProps> = ({
  size = 'md',
  onClick,
  showRipples = true,
  showSteam = true,
  className = '',
  badgeText,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none group cursor-pointer ${className}`}
      title="Gate 7 Sonic Flavor Pairings: Cà phê và Âm nhạc ôm trọn cảm xúc"
    >
      {/* Sound Frequency Acoustic Harmonic Ripple Waves */}
      {showRipples && (
        <>
          <span className="absolute inset-0 bg-[#FEBC11]/25 rounded-full animate-sonic-ripple pointer-events-none"></span>
          <span
            className="absolute inset-0 border-2 border-[#FEBC11]/60 rounded-full animate-sonic-ripple pointer-events-none"
            style={{ animationDelay: '0.9s' }}
          ></span>
        </>
      )}

      {/* Floating Coffee Steam & Musical Harmony Notes */}
      {showSteam && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-end gap-1.5 pointer-events-none z-20">
          {/* Floating Heart / Love for Coffee & Music */}
          <span className="text-[10px] text-red-500 animate-heart-float leading-none select-none">
            ♥
          </span>
          <span
            className="text-[9px] text-[#FEBC11] font-bold animate-heart-float leading-none select-none"
            style={{ animationDelay: '0.7s' }}
          >
            ♪
          </span>
          <span
            className="text-[8px] text-amber-600 font-bold animate-heart-float leading-none select-none"
            style={{ animationDelay: '1.2s' }}
          >
            ☕
          </span>
        </div>
      )}

      {/* Coffee Bean & Music Note Hugging Characters SVG */}
      <div
        className={`relative ${sizeClasses[size]} flex items-center justify-center animate-hug-sway group-hover:scale-110 transition-transform duration-300`}
      >
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full drop-shadow-[2px_2px_0px_rgba(0,0,0,0.85)] overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle warm glow behind the hug */}
          <circle cx="32" cy="36" r="22" fill="#FEBC11" fillOpacity="0.15" />

          {/* === COFFEE BEAN (LEFT) === */}
          <g className="origin-bottom">
            {/* Bean Body */}
            <path
              d="M 23 18 C 14 18, 9 26, 9 37 C 9 48, 16 54, 25 54 C 33 54, 37 47, 37 38 C 37 26, 32 18, 23 18 Z"
              fill="#784421"
              stroke="#1A0F07"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Bean Roast Highlight */}
            <path
              d="M 13 32 C 12 25, 17 21, 23 21"
              stroke="#A26235"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Iconic Coffee Bean Center Crease */}
            <path
              d="M 22 22 C 26 29, 20 41, 25 51"
              stroke="#3D1C06"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Bean Eyes - Happy Curved */}
            <path
              d="M 14 32 Q 16.5 29 19 32"
              stroke="#1A0F07"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 22 32 Q 24.5 29 27 32"
              stroke="#1A0F07"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Bean Blush */}
            <circle cx="13" cy="36" r="2.2" fill="#E76F51" fillOpacity="0.7" />
            <circle cx="28" cy="36" r="2.2" fill="#E76F51" fillOpacity="0.7" />
            {/* Bean Smile */}
            <path
              d="M 18 37 Q 20.5 40 23 37"
              stroke="#1A0F07"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Bean Arm Hugging Music Note */}
            <path
              d="M 26 39 C 32 40, 39 42, 43 44"
              stroke="#1A0F07"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 26 39 C 32 40, 39 42, 43 44"
              stroke="#8D5028"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* === MUSIC NOTE (RIGHT) === */}
          <g className="origin-bottom">
            {/* Music Note Stem */}
            <rect
              x="47"
              y="16"
              width="4.5"
              height="28"
              rx="2"
              fill="#FEBC11"
              stroke="#0D0D0E"
              strokeWidth="2"
            />

            {/* Music Note Flag / Quaver Wave */}
            <path
              d="M 51 16 C 59 18, 62 26, 54 33 C 51.5 35, 51 31, 51 27 Z"
              fill="#FEBC11"
              stroke="#0D0D0E"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Music Note Head (Round body) */}
            <ellipse
              cx="42"
              cy="44"
              rx="8.5"
              ry="7"
              transform="rotate(-15 42 44)"
              fill="#FEBC11"
              stroke="#0D0D0E"
              strokeWidth="2.5"
            />

            {/* Note Eyes - Happy Curved */}
            <path
              d="M 38 42 Q 40 39 42 42"
              stroke="#0D0D0E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 44 41 Q 46 38 48 41"
              stroke="#0D0D0E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Note Blush */}
            <circle cx="37" cy="45" r="1.8" fill="#F87171" fillOpacity="0.8" />
            <circle cx="47" cy="44" r="1.8" fill="#F87171" fillOpacity="0.8" />

            {/* Note Smile */}
            <path
              d="M 41 45 Q 43 47 45 45"
              stroke="#0D0D0E"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Music Note Arm Hugging Coffee Bean */}
            <path
              d="M 46 34 C 38 31, 30 31, 23 35"
              stroke="#0D0D0E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 46 34 C 38 31, 30 31, 23 35"
              stroke="#FEBC11"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Little spark / love star between them */}
          <polygon
            points="33,26 34.5,29 37.5,29.5 35,31.5 36,34.5 33,32.5 30,34.5 31,31.5 28.5,29.5 31.5,29"
            fill="#FEBC11"
            stroke="#0D0D0E"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Optional Mini Tag */}
      {badgeText && (
        <span className="absolute -bottom-2.5 -right-2 bg-black text-[#FEBC11] text-[8px] font-black uppercase px-1 py-0.2 border border-[#FEBC11] shadow-[1px_1px_0px_#000000] whitespace-nowrap z-20">
          {badgeText}
        </span>
      )}
    </div>
  );
};

