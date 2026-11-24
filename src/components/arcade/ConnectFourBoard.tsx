import { useState } from 'react';
import {
  C4_COLS,
  C4_ROWS,
  dropConnect4Disc,
  findDropRow,
  type Connect4State,
} from '../../games/engines/connect4Engine';
import type { ArcadeGameProps } from '../../types/arcade';

export function ConnectFourBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<Connect4State>) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const myPlayerNum: '1' | '2' | 'both' | 'spectator' =
    mode === 'local'
      ? 'both'
      : viewerUid === player1.uid
        ? '1'
        : viewerUid === player2.uid
          ? '2'
          : 'spectator';

  const canPlay = !isFinished && !busy && (myPlayerNum === 'both' || myPlayerNum === state.turn);

  const handleDrop = async (col: number) => {
    if (!canPlay) return;
    if (findDropRow(state.board, col) === -1) return;
    const nextState = dropConnect4Disc(state, col);
    const nextTurnUid = nextState.turn === '1' ? player1.uid : player2.uid;
    const finished = nextState.winner !== '';
    const winnerUid =
      nextState.winner === '1'
        ? player1.uid
        : nextState.winner === '2'
          ? player2.uid
          : nextState.winner === 'draw'
            ? 'draw'
            : '';

    const resultSummary =
      nextState.winner === 'draw'
        ? 'All 42 slots filled — Draw match!'
        : nextState.winner === '1'
          ? `${player1.name} connected four!`
          : nextState.winner === '2'
            ? `${player2.name} connected four!`
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
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-2xl mx-auto">
      {/* Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold ${
              state.turn === '1' && !isFinished ? 'bg-rose-100' : 'bg-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full border-2 border-slate-900 bg-rose-500 inline-block" />
            <span>{player1.name}</span>
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold ${
              state.turn === '2' && !isFinished ? 'bg-amber-100' : 'bg-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full border-2 border-slate-900 bg-amber-300 inline-block" />
            <span>{player2.name}</span>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
          Discs: {state.moveCount}/42
        </span>
      </div>

      {/* Drop Preview Row */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 px-3 sm:px-4 mb-2 h-9 items-center">
        {Array.from({ length: C4_COLS }, (_, col) => {
          const playableCol = canPlay && findDropRow(state.board, col) !== -1;
          const showPreview = playableCol && hoverCol === col;
          return (
            <div key={col} className="flex items-center justify-center">
              {showPreview && (
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-slate-900 animate-mark ${
                    state.turn === '1' ? 'bg-rose-500' : 'bg-amber-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Cobalt 7x6 Frame */}
      <div className="bg-blue-600 border-2 border-slate-900 rounded-2xl p-3 sm:p-4 shadow-[0_6px_0_0_#0F172A]">
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: C4_ROWS }, (_, r) =>
            Array.from({ length: C4_COLS }, (_, c) => {
              const idx = r * C4_COLS + c;
              const disc = state.board[idx];
              const isWin = state.winCells.includes(idx);
              const isLast = state.lastDropIndex === idx;
              const colPlayable = canPlay && findDropRow(state.board, c) !== -1;

              return (
                <button
                  key={idx}
                  type="button"
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => void handleDrop(c)}
                  disabled={!colPlayable}
                  aria-label={`Drop disc in column ${c + 1}`}
                  className={`aspect-square rounded-full border-2 border-slate-900 flex items-center justify-center transition-transform ${
                    disc === '1'
                      ? 'bg-rose-500'
                      : disc === '2'
                        ? 'bg-amber-300'
                        : 'bg-[#FFFDF7]'
                  } ${isWin ? 'ring-4 ring-emerald-400 scale-105' : ''} ${
                    isLast ? 'animate-mark' : ''
                  } ${colPlayable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
                >
                  {isWin && <span className="w-3 h-3 rounded-full bg-white border border-slate-900" />}
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
