import { useMemo, useState } from 'react';
import { formatRelativeTime } from '../lib/gameLogic';
import type { GameRoom, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface HistoryViewProps {
  currentUser: PlayerProfile;
  myGames: GameRoom[];
  onOpenGame: (gameId: string) => void;
}

type HistoryFilter = 'all' | 'win' | 'loss' | 'draw';

function MiniBoard({ board, winningLine }: { board: GameRoom['board']; winningLine: number[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-16 h-16 p-1 bg-slate-100 border border-slate-200 rounded-md shrink-0">
      {board.map((cell, idx) => {
        const isWin = winningLine.includes(idx);
        return (
          <div
            key={idx}
            className={`rounded-[3px] flex items-center justify-center text-[10px] font-display font-bold ${
              isWin
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-white text-slate-700'
            }`}
          >
            <span
              className={
                cell === 'X' ? 'text-rose-600' : cell === 'O' ? 'text-blue-600' : ''
              }
            >
              {cell}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HistoryView({ currentUser, myGames, onOpenGame }: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const finishedGames = useMemo(() => {
    return myGames.filter((g) => g.status === 'finished');
  }, [myGames]);

  const filteredGames = useMemo(() => {
    return finishedGames.filter((g) => {
      if (filter === 'all') return true;
      if (filter === 'draw') return g.winner === 'draw';
      if (filter === 'win') return g.winnerUid === currentUser.uid;
      return g.winner !== 'draw' && g.winnerUid !== currentUser.uid;
    });
  }, [finishedGames, filter, currentUser.uid]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Match History</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review every completed match, opponent, mark assignment, and final board state.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['all', 'win', 'loss', 'draw'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer transition-colors ${
                filter === key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {key === 'all' ? 'All' : key === 'win' ? 'Wins' : key === 'loss' ? 'Losses' : 'Draws'}
            </button>
          ))}
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-800">
            {finishedGames.length === 0 ? 'No completed matches yet' : 'No matches match this filter'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Finish a game in the Play lobby to record your first match result here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {filteredGames.map((game) => {
            const iAmX = game.playerXUid === currentUser.uid;
            const opponentName = iAmX ? game.playerOName : game.playerXName;
            const opponentAvatar = iAmX ? game.playerOAvatar : game.playerXAvatar;
            const myMark = iAmX ? 'X' : 'O';

            let outcomeLabel = 'Draw';
            let outcomeColor = 'text-slate-600';
            if (game.winner !== 'draw') {
              if (game.winnerUid === currentUser.uid) {
                outcomeLabel = 'Victory';
                outcomeColor = 'text-emerald-700';
              } else {
                outcomeLabel = 'Defeat';
                outcomeColor = 'text-rose-700';
              }
            }

            return (
              <div
                key={game.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <MiniBoard board={game.board} winningLine={game.winningLine} />
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={opponentAvatar} name={opponentName || 'Opponent'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        vs {opponentName || 'Opponent'}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Played as <span className="font-semibold text-slate-700">{myMark}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {game.moveCount} moves
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        Room <span className="font-mono">{game.inviteCode}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {formatRelativeTime((game.finishedAt ?? game.updatedAt)?.toDate() ?? null)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <span className={`text-sm font-bold ${outcomeColor}`}>{outcomeLabel}</span>
                  <button
                    type="button"
                    onClick={() => onOpenGame(game.id)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
