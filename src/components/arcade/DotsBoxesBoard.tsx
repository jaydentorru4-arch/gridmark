import {
  DB_BOXES,
  DB_DOTS,
  claimDotsBoxesEdge,
  type DotsBoxesState,
} from '../../games/engines/dotsBoxesEngine';
import type { ArcadeGameProps } from '../../types/arcade';

export function DotsBoxesBoard({
  mode,
  state,
  player1,
  player2,
  viewerUid,
  isFinished,
  busy,
  onCommitState,
}: ArcadeGameProps<DotsBoxesState>) {
  const me: '1' | '2' | 'both' | 'spectator' =
    mode === 'local'
      ? 'both'
      : viewerUid === player1.uid
        ? '1'
        : viewerUid === player2.uid
          ? '2'
          : 'spectator';

  const canAct = !isFinished && !busy && (me === 'both' || me === state.turn);

  const handleClaim = async (kind: 'h' | 'v', row: number, col: number) => {
    if (!canAct) return;
    const nextState = claimDotsBoxesEdge(state, kind, row, col);
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

    const resultSummary = finished
      ? `Final Score ${nextState.p1Score}–${nextState.p2Score}`
      : '';

    await onCommitState({
      nextState,
      nextTurnUid,
      finished,
      winnerUid,
      resultSummary,
    });
  };

  const p1Initial = (player1.name.trim()[0] || '1').toUpperCase();
  const p2Initial = (player2.name.trim()[0] || '2').toUpperCase();

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-8 shadow-[0_5px_0_0_#0F172A] max-w-xl mx-auto space-y-5">
      {/* Live Score Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold tabular-nums ${
            state.turn === '1' && !isFinished ? 'bg-rose-100' : 'bg-white'
          }`}
        >
          <span className="text-rose-600">{player1.name}:</span> {state.p1Score} boxes
        </div>

        {state.bonusTurn && !isFinished && (
          <span className="px-3 py-1 rounded-lg border-2 border-slate-900 bg-amber-300 text-xs font-bold text-slate-900">
            Box Closed! Bonus Turn
          </span>
        )}

        <div
          className={`px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold tabular-nums ${
            state.turn === '2' && !isFinished ? 'bg-sky-100' : 'bg-white'
          }`}
        >
          <span className="text-blue-600">{player2.name}:</span> {state.p2Score} boxes
        </div>
      </div>

      {/* 5x5 Dot Grid (9x9 CSS track matrix: dot, h-edge, dot, ...) */}
      <div className="max-w-[400px] mx-auto p-4 rounded-2xl border-2 border-slate-900 bg-amber-50/40 select-none">
        <div
          className="grid items-center justify-items-center"
          style={{
            gridTemplateColumns: '16px 1fr 16px 1fr 16px 1fr 16px 1fr 16px',
            gridTemplateRows: '16px 64px 16px 64px 16px 64px 16px 64px 16px',
          }}
        >
          {Array.from({ length: DB_DOTS * 2 - 1 }, (_, gr) =>
            Array.from({ length: DB_DOTS * 2 - 1 }, (_, gc) => {
              const isEvenR = gr % 2 === 0;
              const isEvenC = gc % 2 === 0;

              // Dot
              if (isEvenR && isEvenC) {
                return (
                  <div
                    key={`${gr}-${gc}`}
                    className="w-4 h-4 rounded-full bg-slate-900 z-10"
                  />
                );
              }

              // Horizontal Edge
              if (isEvenR && !isEvenC) {
                const row = gr / 2;
                const col = (gc - 1) / 2;
                const owner = state.hLines[row * DB_BOXES + col];
                const isLast = state.lastLineKey === `h-${row}-${col}`;
                return (
                  <button
                    key={`${gr}-${gc}`}
                    type="button"
                    disabled={owner !== 0 || !canAct}
                    onClick={() => void handleClaim('h', row, col)}
                    aria-label={`Horizontal line row ${row + 1} col ${col + 1}`}
                    className={`w-full h-5 flex items-center justify-center group ${
                      owner === 0 && canAct ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`w-full h-2.5 rounded-full transition-colors ${
                        owner === 1
                          ? 'bg-rose-500 border border-slate-900'
                          : owner === 2
                            ? 'bg-blue-600 border border-slate-900'
                            : canAct
                              ? 'bg-slate-200 group-hover:bg-amber-400'
                              : 'bg-slate-200'
                      } ${isLast ? 'ring-2 ring-amber-400' : ''}`}
                    />
                  </button>
                );
              }

              // Vertical Edge
              if (!isEvenR && isEvenC) {
                const row = (gr - 1) / 2;
                const col = gc / 2;
                const owner = state.vLines[row * DB_DOTS + col];
                const isLast = state.lastLineKey === `v-${row}-${col}`;
                return (
                  <button
                    key={`${gr}-${gc}`}
                    type="button"
                    disabled={owner !== 0 || !canAct}
                    onClick={() => void handleClaim('v', row, col)}
                    aria-label={`Vertical line row ${row + 1} col ${col + 1}`}
                    className={`w-5 h-full flex items-center justify-center group ${
                      owner === 0 && canAct ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`h-full w-2.5 rounded-full transition-colors ${
                        owner === 1
                          ? 'bg-rose-500 border border-slate-900'
                          : owner === 2
                            ? 'bg-blue-600 border border-slate-900'
                            : canAct
                              ? 'bg-slate-200 group-hover:bg-amber-400'
                              : 'bg-slate-200'
                      } ${isLast ? 'ring-2 ring-amber-400' : ''}`}
                    />
                  </button>
                );
              }

              // Box center
              const br = (gr - 1) / 2;
              const bc = (gc - 1) / 2;
              const boxOwner = state.boxes[br * DB_BOXES + bc];
              return (
                <div
                  key={`${gr}-${gc}`}
                  className={`w-full h-full rounded-lg flex items-center justify-center font-display text-lg font-extrabold ${
                    boxOwner === 1
                      ? 'bg-rose-200 text-rose-800 animate-mark'
                      : boxOwner === 2
                        ? 'bg-sky-200 text-blue-900 animate-mark'
                        : 'bg-transparent'
                  }`}
                >
                  {boxOwner === 1 ? p1Initial : boxOwner === 2 ? p2Initial : ''}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
