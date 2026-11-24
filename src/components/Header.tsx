import { Award, Clock, Gamepad2, Swords, User } from 'lucide-react';
import type { NavTab, PlayerProfile } from '../types/game';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  profile: PlayerProfile;
  pendingChallengesCount: number;
}

export function Header({
  activeTab,
  onSelectTab,
  profile,
  pendingChallengesCount,
}: HeaderProps) {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'play', label: 'Play' },
    {
      id: 'challenges',
      label: pendingChallengesCount > 0 ? `Challenges (${pendingChallengesCount})` : 'Challenges',
    },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'history', label: 'History' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-xs border-b-2 border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('play')}
            className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded"
          >
            Gridmark
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${
                    isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 -bottom-[17px] h-1 bg-rose-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className={`px-4 py-2 rounded-xl border-2 border-slate-900 text-sm font-bold shadow-[0_2px_0_0_#0F172A] active:translate-y-[1px] active:shadow-none whitespace-nowrap shrink-0 cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                activeTab === 'profile'
                  ? 'bg-amber-300 text-slate-900'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {profile.displayName}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation bar (<= 15% mobile viewport height) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFDF7] border-t-2 border-slate-900 grid grid-cols-5 h-14"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          onClick={() => onSelectTab('play')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeTab === 'play' ? 'text-blue-600' : 'text-slate-600'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span className="whitespace-nowrap">Play</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('challenges')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeTab === 'challenges' ? 'text-blue-600' : 'text-slate-600'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span className="whitespace-nowrap">
            {pendingChallengesCount > 0 ? `Duels (${pendingChallengesCount})` : 'Duels'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('leaderboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeTab === 'leaderboard' ? 'text-blue-600' : 'text-slate-600'
          }`}
        >
          <Award className="w-4 h-4" />
          <span className="whitespace-nowrap">Ranks</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeTab === 'history' ? 'text-blue-600' : 'text-slate-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="whitespace-nowrap">History</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeTab === 'profile' ? 'text-blue-600' : 'text-slate-600'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="whitespace-nowrap">Profile</span>
        </button>
      </nav>
    </>
  );
}
