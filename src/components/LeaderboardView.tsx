import { useMemo, useState } from 'react';
import { computeWinRate } from '../lib/gameLogic';
import type { PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface LeaderboardViewProps {
  players: PlayerProfile[];
  currentUser: PlayerProfile;
}

type SortKey = 'points' | 'wins' | 'winRate';

export function LeaderboardView({ players, currentUser }: LeaderboardViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('points');

  const rankedPlayers = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      if (sortBy === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.points - a.points;
      }
      if (sortBy === 'winRate') {
        const rateA = computeWinRate(a.wins, a.gamesPlayed);
        const rateB = computeWinRate(b.wins, b.gamesPlayed);
        if (rateB !== rateA) return rateB - rateA;
        return b.wins - a.wins;
      }
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
    return copy;
  }, [players, sortBy]);

  const myRank = rankedPlayers.findIndex((p) => p.uid === currentUser.uid) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rankings update immediately after every completed match · 3 pts per win, 1 pt per draw.
          </p>
        </div>

        {/* Sort Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSortBy('points')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
              sortBy === 'points' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Points
          </button>
          <button
            type="button"
            onClick={() => setSortBy('wins')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
              sortBy === 'wins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Most Wins
          </button>
          <button
            type="button"
            onClick={() => setSortBy('winRate')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
              sortBy === 'winRate' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Win Rate
          </button>
        </div>
      </div>

      {/* Personal Standing Strip */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500">Your Rank</p>
          <p className="font-display text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {myRank > 0 ? `#${myRank}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Total Points</p>
          <p className="font-display text-xl font-bold text-blue-600 tabular-nums mt-0.5">
            {currentUser.points}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Record (W-L-D)</p>
          <p className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-1">
            {currentUser.wins}-{currentUser.losses}-{currentUser.draws}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Best Streak</p>
          <p className="font-display text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {currentUser.bestStreak}
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {rankedPlayers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No ranked players yet. Complete a match to claim #1.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 pl-6 pr-3 w-16">Rank</th>
                  <th className="py-3.5 px-3">Player</th>
                  <th className="py-3.5 px-3 text-right">Played</th>
                  <th className="py-3.5 px-3 text-right">W-L-D</th>
                  <th className="py-3.5 px-3 text-right">Win %</th>
                  <th className="py-3.5 px-3 text-right">Streak</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rankedPlayers.map((player, index) => {
                  const isMe = player.uid === currentUser.uid;
                  const winRate = computeWinRate(player.wins, player.gamesPlayed);
                  return (
                    <tr
                      key={player.uid}
                      className={isMe ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'}
                    >
                      <td className="py-3.5 pl-6 pr-3 font-mono font-semibold text-slate-700 tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AvatarBadge avatarId={player.avatarId} name={player.displayName} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {player.displayName}
                              {isMe ? ' (You)' : ''}
                            </p>
                            <p className="text-xs text-slate-500 truncate">@{player.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {player.gamesPlayed}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {player.wins}-{player.losses}-{player.draws}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {winRate}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                        {player.winStreak}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {player.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
