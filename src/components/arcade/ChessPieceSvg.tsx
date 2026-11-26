import type { ChessPiece } from '../../games/engines/chessEngine';

interface ChessPieceSvgProps {
  piece: ChessPiece;
  className?: string;
}

export function ChessPieceSvg({ piece, className = 'w-[82%] h-[82%]' }: ChessPieceSvgProps) {
  if (!piece) return null;

  const isWhite = piece[0] === 'w';
  const kind = piece[1];

  const fill = isWhite ? '#FFFFFF' : '#111827';
  const stroke = isWhite ? '#0F172A' : '#0F172A';
  const detailStroke = isWhite ? '#0F172A' : '#F8FAFC';
  const accentFill = isWhite ? '#E2E8F0' : '#334155';

  // Crisp outer rim glow for Black pieces so they never blend into dark squares,
  // and bold dark outline for White pieces so they never blend into light squares.
  const shadowStyle = isWhite
    ? { filter: 'drop-shadow(0 2px 1.5px rgba(15, 23, 42, 0.32))' }
    : { filter: 'drop-shadow(0 0 1.4px rgba(255, 255, 255, 0.72)) drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.45))' };

  return (
    <svg
      viewBox="0 0 45 45"
      className={`select-none pointer-events-none ${className}`}
      style={shadowStyle}
      aria-hidden="true"
    >
      {kind === 'P' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <circle cx="22.5" cy="13.5" r="5" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path
            d="M17 20.5c1.5-1.5 9.5-1.5 11 0l-1.5 6.5c2 2.2 3.5 5 3.8 8.5H14.7c.3-3.5 1.8-6.3 3.8-8.5L17 20.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <rect x="11.5" y="35.5" width="22" height="4.5" rx="2" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M16.5 21.2h12" stroke={detailStroke} strokeWidth="1.7" fill="none" />
          <path d="M15.5 34.5h14" stroke={detailStroke} strokeWidth="1.5" fill="none" />
        </g>
      )}

      {kind === 'R' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M11 10h4.5v3.5h4V10h6v3.5h4V10H34v7.5l-3 2.5v12.5l3 3v4.5H11v-4.5l3-3V20l-3-2.5V10z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <path d="M14.5 20h16" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M14.5 32.5h16" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M12.5 36.2h20" stroke={detailStroke} strokeWidth="1.6" fill="none" />
        </g>
      )}

      {kind === 'N' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M22 9c-4.5.8-8.8 4.4-10.5 9-.8 2.2.4 4.2 2.7 4.4 2 .2 4-.8 5.2-2.2-.8 2.8-3.6 5.2-6.2 7.5-1.8 1.6-2.4 4.2-2.2 7.3h23c.2-5.5-1-11.2-3.4-16.2C28.8 13.8 25.8 9.6 22 9z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <path d="M19 10.2l1.8-3.2 2.7 2.5" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="10.5" y="35" width="24" height="5" rx="2" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <circle cx="17.5" cy="16" r="1.4" fill={detailStroke} />
          <path
            d="M25.5 13c2.4 4 3.8 9.5 3.8 16.5"
            stroke={detailStroke}
            strokeWidth="1.6"
            fill="none"
          />
        </g>
      )}

      {kind === 'B' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <circle cx="22.5" cy="8.5" r="2.6" fill={fill} stroke={stroke} strokeWidth="2" />
          <path
            d="M22.5 11.5c-5.5 3.6-8.2 9.4-6.4 15.6.7 2.2 2 3.8 3.2 4.9h6.4c1.2-1.1 2.5-2.7 3.2-4.9 1.8-6.2-.9-12-6.4-15.6z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <path
            d="M12 36c3-2 7-2.8 10.5-1.6 3.5-1.2 7.5-.4 10.5 1.6v4H12v-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <path d="M18.5 31.8h8" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M22.5 17.5v6.5M19.5 20.8h6" stroke={detailStroke} strokeWidth="1.8" fill="none" />
        </g>
      )}

      {kind === 'Q' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <circle cx="9" cy="14" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="15.5" cy="10.5" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="22.5" cy="9" r="2.3" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="29.5" cy="10.5" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="36" cy="14" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <path
            d="M10 16.5l5 10.5 1-14 6.5 12 6.5-12 1 14 5-10.5-3 18.5H13l-3-18.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <rect x="11.5" y="34.5" width="22" height="5.2" rx="2.2" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M14 31.5h17" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M13 36.2h19" stroke={detailStroke} strokeWidth="1.5" fill="none" />
        </g>
      )}

      {kind === 'K' && (
        <g strokeLinejoin="round" strokeLinecap="round">
          <path d="M22.5 6.5v6.5M19 9.5h7" stroke={stroke} strokeWidth="2.8" fill="none" />
          {!isWhite && (
            <path d="M22.5 7v5.5M19.5 9.5h6" stroke="#F8FAFC" strokeWidth="1.2" fill="none" />
          )}
          <path
            d="M16.5 14c1.8-1.6 10.2-1.6 12 0 4.5.8 7.5 4.2 6.8 9.2-.6 4-3.2 7.4-5.3 9.8H15c-2.1-2.4-4.7-5.8-5.3-9.8-.7-5 2.3-8.4 6.8-9.2z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
          />
          <rect x="11.5" y="33.5" width="22" height="6" rx="2.2" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M22.5 14.5v16" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M14.5 29.5h16" stroke={detailStroke} strokeWidth="1.6" fill="none" />
          <path d="M13.5 35.8h18" stroke={detailStroke} strokeWidth="1.5" fill="none" />
          <circle cx="22.5" cy="18.5" r="1.4" fill={accentFill} stroke={detailStroke} strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}
