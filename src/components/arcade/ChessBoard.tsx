import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
  executeChessMove,
  findKingIndex,
  getLegalMovesForSquare,
  type ChessColor,
  type ChessPiece,
  type ChessState,
  type PromoKind,
} from '../../games/engines/chessEngine';
import type { ArcadeGameProps } from '../../types/arcade';

const PIECE_GLYPHS: Record<Exclude<ChessPiece, ''>, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function ChessGlyph({ piece }: { piece: ChessPiece }) {
  if (!piece) return null;
  const isWhite = piece.startsWith('w');
  return (
    <span
      className={`select-none leading-none text-[1.75rem] sm:text-[2.1rem] ${
        isWhite
          ? 'text-white drop-shadow-[0_1.5px_0_#0F172A] [-webkit-text-stroke:1.2px_#0F172A]'
          : 'text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]'
      }`}
    >
      {PIECE_GLYPHS[piece]}
    </span>
  );
}

export function ChessBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<ChessState>) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: number; to: number } | null>(null);
  const [flippedManual, setFlippedManual] = useState<boolean>(
    mode === 'online' && viewerUid === player2.uid,
  );

  const myColor: ChessColor | 'both' | 'spectator' =
    mode === 'local'
      ? 'both'
      : viewerUid === player1.uid
        ? 'w'
        : viewerUid === player2.uid
          ? 'b'
          : 'spectator';

  const canAct =
    !isFinished &&
    !busy &&
    (myColor === 'both' || myColor === state.turn);

  const legalMoves = useMemo(() => {
    if (selectedIdx === null || !canAct) return [];
    return getLegalMovesForSquare(state, selectedIdx);
  }, [state, selectedIdx, canAct]);

  const legalDestMap = useMemo(() => {
    const map = new Map<number, (typeof legalMoves)[number]>();
    for (const m of legalMoves) map.set(m.to, m);
    return map;
  }, [legalMoves]);

  const checkKingIdx = state.inCheck ? findKingIndex(state.board, state.inCheck) : -1;

  const commitMove = async (from: number, to: number, promo: PromoKind = 'Q') => {
    const nextState = executeChessMove(state, from, to, promo);
    setSelectedIdx(null);
    setPendingPromo(null);

    const nextTurnUid = nextState.turn === 'w' ? player1.uid : player2.uid;
    const finished = nextState.outcome !== '';
    const winnerUid =
      nextState.outcome === 'w'
        ? player1.uid
        : nextState.outcome === 'b'
          ? player2.uid
          : nextState.outcome === 'draw'
            ? 'draw'
            : '';

    await onCommitState({
      nextState,
      nextTurnUid,
      finished,
      winnerUid,
      resultSummary: nextState.outcomeReason,
    });
  };

  const handleSquareClick = (idx: number) => {
    if (!canAct) return;

    const targetMove = legalDestMap.get(idx);
    if (targetMove && selectedIdx !== null) {
      if (targetMove.isPromotion) {
        setPendingPromo({ from: selectedIdx, to: idx });
      } else {
        void commitMove(selectedIdx, idx, 'Q');
      }
      return;
    }

    const piece = state.board[idx];
    if (piece && piece.startsWith(state.turn)) {
      setSelectedIdx(selectedIdx === idx ? null : idx);
    } else {
      setSelectedIdx(null);
    }
  };

  const displayOrder = useMemo(() => {
    const indices: number[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const actualR = flippedManual ? 7 - r : r;
        const actualC = flippedManual ? 7 - c : c;
        indices.push(actualR * 8 + actualC);
      }
    }
    return indices;
  }, [flippedManual]);

  const whitePlayerName = player1.name;
  const blackPlayerName = player2.name;

  // Pair moves into full moves for table display
  const movePairs: Array<{ num: number; white: string; black: string }> = [];
  for (let i = 0; i < state.moves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: state.moves[i] || '',
      black: state.moves[i + 1] || '',
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Chessboard */}
      <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-6 shadow-[0_5px_0_0_#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 ${
                state.turn === 'w' && !isFinished ? 'bg-amber-300 text-slate-900' : 'bg-white text-slate-600'
              }`}
            >
              ♔ White: {whitePlayerName}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 ${
                state.turn === 'b' && !isFinished ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
              }`}
            >
              ♚ Black: {blackPlayerName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFlippedManual((f) => !f)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-amber-50 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Flip Board
          </button>
        </div>

        {state.inCheck && !isFinished && (
          <div className="mb-3 rounded-xl border-2 border-rose-500 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 text-center">
            {state.inCheck === 'w' ? 'White' : 'Black'} King is in Check!
          </div>
        )}

        {/* 8x8 Grid */}
        <div className="relative aspect-square w-full max-w-[520px] mx-auto border-2 border-slate-900 rounded-xl overflow-hidden shadow-[0_4px_0_0_#0F172A] grid grid-cols-8">
          {displayOrder.map((idx) => {
            const r = Math.floor(idx / 8);
            const c = idx % 8;
            const isDark = (r + c) % 2 === 1;
            const piece = state.board[idx];
            const isSelected = selectedIdx === idx;
            const legalOpt = legalDestMap.get(idx);
            const isLastMove = state.lastFrom === idx || state.lastTo === idx;
            const isCheckSq = checkKingIdx === idx;

            let bgClass = isDark ? 'bg-amber-700/80' : 'bg-amber-50';
            if (isLastMove) bgClass = isDark ? 'bg-amber-500/85' : 'bg-amber-200';
            if (isSelected) bgClass = 'bg-sky-300';
            if (isCheckSq) bgClass = 'bg-rose-400';

            const showRank = flippedManual ? c === 7 : c === 0;
            const showFile = flippedManual ? r === 0 : r === 7;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSquareClick(idx)}
                className={`relative aspect-square flex items-center justify-center ${bgClass} ${
                  canAct ? 'cursor-pointer' : 'cursor-default'
                } focus:outline-none`}
                aria-label={`Square ${FILES[c]}${8 - r}`}
              >
                {showRank && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-mono font-bold ${
                      isDark ? 'text-amber-100' : 'text-amber-900/70'
                    }`}
                  >
                    {8 - r}
                  </span>
                )}
                {showFile && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold ${
                      isDark ? 'text-amber-100' : 'text-amber-900/70'
                    }`}
                  >
                    {FILES[c]}
                  </span>
                )}

                {legalOpt && piece === '' && (
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900/35 pointer-events-none" />
                )}
                {legalOpt && piece !== '' && (
                  <span className="absolute inset-1 rounded-full border-[3px] border-slate-900/50 pointer-events-none" />
                )}

                <ChessGlyph piece={piece} />
              </button>
            );
          })}

          {/* Promotion Picker Overlay */}
          {pendingPromo && (
            <div className="absolute inset-0 bg-slate-900/55 flex items-center justify-center p-4 z-10">
              <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[0_5px_0_0_#0F172A] text-center">
                <p className="font-display text-base font-bold text-slate-900">
                  Promote Pawn
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2.5">
                  {(['Q', 'R', 'B', 'N'] as const).map((promo) => (
                    <button
                      key={promo}
                      type="button"
                      onClick={() => void commitMove(pendingPromo.from, pendingPromo.to, promo)}
                      className="w-12 h-12 rounded-xl border-2 border-slate-900 bg-amber-100 hover:bg-amber-300 flex items-center justify-center cursor-pointer"
                    >
                      <ChessGlyph piece={`${state.turn}${promo}` as ChessPiece} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingPromo(null)}
                  className="mt-3 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Captured Pieces & Move History */}
      <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A] space-y-5">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">Captured Pieces</h3>
          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-h-[38px]">
              <span className="font-bold text-slate-700 shrink-0">White took:</span>
              <div className="flex flex-wrap gap-1 text-base leading-none">
                {state.capturedByWhite.length === 0 ? (
                  <span className="text-xs text-slate-400">None</span>
                ) : (
                  state.capturedByWhite.map((p, i) => (
                    <span key={i}>{p ? PIECE_GLYPHS[p] : ''}</span>
                  ))
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-h-[38px]">
              <span className="font-bold text-slate-700 shrink-0">Black took:</span>
              <div className="flex flex-wrap gap-1 text-base leading-none">
                {state.capturedByBlack.length === 0 ? (
                  <span className="text-xs text-slate-400">None</span>
                ) : (
                  state.capturedByBlack.map((p, i) => (
                    <span key={i}>{p ? PIECE_GLYPHS[p] : ''}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">Move History</h3>
            <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
              {state.moves.length} moves
            </span>
          </div>

          <div className="mt-2.5 border-2 border-slate-900 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
            {movePairs.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 text-center">
                White moves first. Select a piece to highlight legal squares.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left font-bold text-slate-600 w-12">#</th>
                    <th className="py-2 px-3 text-left font-bold text-slate-800">White</th>
                    <th className="py-2 px-3 text-left font-bold text-slate-800">Black</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {movePairs.map((row) => (
                    <tr key={row.num}>
                      <td className="py-1.5 px-3 text-slate-500 tabular-nums">{row.num}.</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">{row.white}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900">{row.black}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
