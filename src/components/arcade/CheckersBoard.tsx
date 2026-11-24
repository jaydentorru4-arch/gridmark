import { useMemo, useState } from 'react';
import { ArrowUpDown, Crown } from 'lucide-react';
import {
  executeCheckerMove,
  getLegalCheckerMovesForSquare,
  hasMandatoryCapture,
  type CheckerSide,
  type CheckersState,
} from '../../games/engines/checkersEngine';
import type { ArcadeGameProps } from '../../types/arcade';

export function CheckersBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<CheckersState>) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    state.chainIdx !== -1 ? state.chainIdx : null,
  );
  const [flipped, setFlipped] = useState<boolean>(
    mode !== 'local' && viewerUid === player2.uid,
  );

  const mySide: CheckerSide | 'both' | 'spectator' =
    mode === 'local'
      ? 'both'
      : viewerUid === player1.uid
        ? 'r'
        : viewerUid === player2.uid
          ? 'b'
          : 'spectator';

  const canAct = !isFinished && !busy && (mySide === 'both' || mySide === state.turn);

  const effectiveSelected = state.chainIdx !== -1 ? state.chainIdx : selectedIdx;

  const legalMoves = useMemo(() => {
    if (effectiveSelected === null || !canAct) return [];
    return getLegalCheckerMovesForSquare(state, effectiveSelected);
  }, [state, effectiveSelected, canAct]);

  const legalTargetSet = useMemo(() => new Set(legalMoves.map((m) => m.to)), [legalMoves]);
  const mandatoryJump = !isFinished && hasMandatoryCapture(state);

  const handleSquareClick = async (idx: number) => {
    if (!canAct) return;

    if (effectiveSelected !== null && legalTargetSet.has(idx)) {
      const nextState = executeCheckerMove(state, effectiveSelected, idx);
      setSelectedIdx(nextState.chainIdx !== -1 ? nextState.chainIdx : null);

      const nextTurnUid = nextState.turn === 'r' ? player1.uid : player2.uid;
      const finished = nextState.winner !== '';
      const winnerUid =
        nextState.winner === 'r'
          ? player1.uid
          : nextState.winner === 'b'
            ? player2.uid
            : '';

      await onCommitState({
        nextState,
        nextTurnUid,
        finished,
        winnerUid,
        resultSummary: nextState.outcomeReason,
      });
      return;
    }

    if (state.chainIdx !== -1) return; // Locked to jumping piece

    const piece = state.board[idx];
    if (piece && piece.toLowerCase() === state.turn) {
      setSelectedIdx(selectedIdx === idx ? null : idx);
    } else {
      setSelectedIdx(null);
    }
  };

  const displayOrder = useMemo(() => {
    const arr: number[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const ar = flipped ? 7 - r : r;
        const ac = flipped ? 7 - c : c;
        arr.push(ar * 8 + ac);
      }
    }
    return arr;
  }, [flipped]);

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-7 shadow-[0_5px_0_0_#0F172A] max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 ${
              state.turn === 'r' && !isFinished ? 'bg-rose-100' : 'bg-white'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-rose-500 inline-block" />
            <span>{player1.name}</span>
            <span className="font-mono text-slate-500 tabular-nums">({12 - state.rCaptured})</span>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-900 ${
              state.turn === 'b' && !isFinished ? 'bg-slate-200' : 'bg-white'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-slate-900 inline-block" />
            <span>{player2.name}</span>
            <span className="font-mono text-slate-500 tabular-nums">({12 - state.bCaptured})</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-amber-50 cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Flip Board
        </button>
      </div>

      {mandatoryJump && (
        <div className="mb-3 rounded-xl border-2 border-amber-500 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 text-center">
          {state.chainIdx !== -1
            ? 'Multi-jump chain active! Continue capturing with the highlighted piece.'
            : 'Mandatory capture available — you must jump an opponent piece!'}
        </div>
      )}

      <div className="aspect-square w-full max-w-[490px] mx-auto border-2 border-slate-900 rounded-xl overflow-hidden shadow-[0_5px_0_0_#0F172A] grid grid-cols-8">
        {displayOrder.map((idx) => {
          const r = Math.floor(idx / 8);
          const c = idx % 8;
          const isDark = (r + c) % 2 === 1;
          const piece = state.board[idx];
          const isSelected = effectiveSelected === idx;
          const isTarget = legalTargetSet.has(idx);
          const isLast = state.lastFrom === idx || state.lastTo === idx;

          let bg = isDark ? 'bg-amber-800/85' : 'bg-amber-50';
          if (isLast && isDark) bg = 'bg-amber-700';
          if (isSelected) bg = 'bg-sky-400';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => void handleSquareClick(idx)}
              aria-label={`Square ${r + 1}-${c + 1}`}
              className={`relative aspect-square flex items-center justify-center ${bg} ${
                canAct && isDark ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {isTarget && (
                <span className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-mark" />
              )}
              {piece !== '' && (
                <span
                  className={`w-[74%] h-[74%] rounded-full border-2 border-slate-900 shadow-[0_2px_0_0_#0F172A] flex items-center justify-center ${
                    piece.toLowerCase() === 'r' ? 'bg-rose-500 text-amber-200' : 'bg-slate-900 text-amber-300'
                  }`}
                >
                  {(piece === 'R' || piece === 'B') && <Crown className="w-4 h-4 sm:w-5 sm:h-5" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
