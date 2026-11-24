import { useMemo } from 'react';
import {
  getLegalReversiMoves,
  playReversiMove,
  type ReversiSide,
  type ReversiState,
} from '../../games/engines/reversiEngine';
import type { ArcadeGameProps } from '../../types/arcade';

export function ReversiBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<ReversiState>) {
  const mySide: ReversiSide | 'both' | 'spectator' =
    mode === 'local'
      ? 'both'
      : viewerUid === player1.uid
        ? 'B'
        : viewerUid === player2.uid
          ? 'W'
          : 'spectator';

  const canAct = !isFinished && !busy && (mySide === 'both' || mySide === state.turn);

  const legalMap = useMemo(() => {
    if (!canAct) return {};
    return getLegalReversiMoves(state.board, state.turn);
  }, [state.board, state.turn, canAct]);

  const flippedSet = useMemo(() => new Set(state.lastFlipped), [state.lastFlipped]);

  const handleCellClick = async (idx: number) => {
    if (!canAct || !legalMap[idx]) return;
    const nextState = playReversiMove(state, idx);
    const nextTurnUid = nextState.turn === 'B' ? player1.uid : player2.uid;
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === 'B'
        ? player1.uid
        : nextState.winner === 'W'
          ? player2.uid
          : nextState.winner === 'draw'
            ? 'draw'
            : '';

    const resultSummary = finished
      ? `Final Discs: Black ${nextState.blackCount} – White ${nextState.whiteCount}`
      : '';

    await onCommitState({
      nextState,
      nextTurnUid,
      finished,
      winnerUid,
      resultSummary,
    });
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-2xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold tabular-nums ${
            state.turn === 'B' && !isFinished ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
          }`}
        >
          <span className="w-4 h-4 rounded-full border border-slate-400 bg-slate-950 inline-block" />
          <span>{player1.name}: {state.blackCount}</span>
        </div>

        <div
          className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold tabular-nums ${
            state.turn === 'W' && !isFinished ? 'bg-amber-200 text-slate-900' : 'bg-white text-slate-800'
          }`}
        >
          <span className="w-4 h-4 rounded-full border-2 border-slate-900 bg-white inline-block" />
          <span>{player2.name}: {state.whiteCount}</span>
        </div>
      </div>

      {state.passNotice && !isFinished && (
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 text-center">
          {state.passNotice}
        </div>
      )}

      {/* 8x8 Emerald Felt Grid */}
      <div className="aspect-square w-full max-w-[490px] mx-auto bg-emerald-700 border-2 border-slate-900 rounded-2xl p-2 shadow-[0_5px_0_0_#0F172A] grid grid-cols-8 gap-1">
        {state.board.map((cell, idx) => {
          const flips = legalMap[idx];
          const isLegal = Boolean(flips);
          const isLast = state.lastMoveIdx === idx;
          const isFlipped = flippedSet.has(idx);

          return (
            <button
              key={idx}
              type="button"
              disabled={!isLegal}
              onClick={() => void handleCellClick(idx)}
              aria-label={`Row ${Math.floor(idx / 8) + 1} Column ${(idx % 8) + 1}`}
              className={`relative aspect-square rounded-md border border-emerald-900/50 flex items-center justify-center transition-colors ${
                isLast ? 'bg-emerald-500' : isLegal ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer' : 'bg-emerald-700 cursor-default'
              }`}
            >
              {cell !== '' && (
                <span
                  className={`w-[78%] h-[78%] rounded-full border-2 border-slate-900 shadow-[0_2px_0_0_#0F172A] ${
                    cell === 'B' ? 'bg-slate-950' : 'bg-white'
                  } ${isFlipped || isLast ? 'animate-mark' : ''}`}
                />
              )}
              {cell === '' && isLegal && (
                <span className="w-5 h-5 rounded-full bg-amber-300/85 border border-slate-900 text-[10px] font-mono font-bold text-slate-900 flex items-center justify-center">
                  {flips.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
