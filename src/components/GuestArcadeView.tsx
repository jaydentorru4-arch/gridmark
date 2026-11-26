import { useState } from 'react';
import { ArrowLeft, Bot, LayoutGrid, Lock, LogIn, Users } from 'lucide-react';
import { getCatalogEntry } from '../data/arcadeCatalog';
import type { BotDifficulty } from '../lib/botAi';
import { soundFx } from '../lib/sound';
import type { AllGameId } from '../types/arcade';
import type { GameMark, PlayerProfile } from '../types/game';
import { BotGameBoard } from './BotGameBoard';
import { LocalGameBoard } from './LocalGameBoard';
import { ArcadeWorkspace } from './arcade/ArcadeWorkspace';
import { GameIcon } from './arcade/GameIcon';
import { GameSwitcherView } from './arcade/GameSwitcherView';

interface GuestArcadeViewProps {
  initialShowSwitcher?: boolean;
  authBusy?: boolean;
  onSignIn: () => void;
  onBackToSignIn: () => void;
}

const GUEST_PROFILE: PlayerProfile = {
  uid: 'guest_offline',
  username: 'guest',
  displayName: 'Guest Player',
  avatarId: 'cobalt',
  bio: '',
  visibility: 'public',
  wins: 0,
  losses: 0,
  draws: 0,
  gamesPlayed: 0,
  points: 0,
  winStreak: 0,
  bestStreak: 0,
  lastMatchId: '',
  isOnline: false,
  lastActiveAt: null,
  createdAt: null,
  updatedAt: null,
};

export function GuestArcadeView({
  initialShowSwitcher = true,
  authBusy = false,
  onSignIn,
  onBackToSignIn,
}: GuestArcadeViewProps) {
  const [selectedGame, setSelectedGame] = useState<AllGameId>('tictactoe');
  const [showSwitcher, setShowSwitcher] = useState(initialShowSwitcher);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tic-Tac-Toe guest mode state
  const [tttLocalMode, setTttLocalMode] = useState(false);
  const [tttBotMode, setTttBotMode] = useState(false);
  const [tttBotDifficulty, setTttBotDifficulty] = useState<BotDifficulty>('tactical');
  const [tttBotMark, setTttBotMark] = useState<GameMark>('X');

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  const tttCatalog = getCatalogEntry('tictactoe');

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Guest Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-xs border-b-2 border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToSignIn}
              className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer rounded"
            >
              Gridmark
            </button>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-amber-100 text-[11px] font-bold text-slate-900 whitespace-nowrap shrink-0">
              Guest Mode · Offline
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSwitcher(true)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              All 11 Games
            </button>

            <button
              type="button"
              onClick={onBackToSignIn}
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <button
              type="button"
              onClick={onSignIn}
              disabled={authBusy}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              {authBusy ? 'Signing in...' : 'Sign In for Online'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8">
        {showSwitcher ? (
          <GameSwitcherView
            selectedGame={selectedGame}
            onSelectGame={(nextGame) => {
              setSelectedGame(nextGame);
              setTttLocalMode(false);
              setTttBotMode(false);
              setShowSwitcher(false);
            }}
            onClose={() => setShowSwitcher(false)}
          />
        ) : selectedGame !== 'tictactoe' ? (
          <ArcadeWorkspace
            gameType={selectedGame}
            currentUser={GUEST_PROFILE}
            openRooms={[]}
            myActiveRooms={[]}
            activeRoomId={null}
            soundEnabled={soundEnabled}
            isGuest={true}
            onRequestSignIn={onSignIn}
            onToggleSound={handleToggleSound}
            onSelectRoom={() => {}}
            onOpenSwitcher={() => setShowSwitcher(true)}
          />
        ) : tttLocalMode ? (
          <LocalGameBoard
            defaultPlayerOneName="Player 1"
            defaultPlayerOneAvatar="cobalt"
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onBack={() => setTttLocalMode(false)}
          />
        ) : tttBotMode ? (
          <BotGameBoard
            playerName="Guest Player"
            playerAvatar="cobalt"
            initialDifficulty={tttBotDifficulty}
            initialMark={tttBotMark}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onBack={() => setTttBotMode(false)}
          />
        ) : (
          <div className="space-y-6">
            {/* Game Switcher Header Bar */}
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-6 shadow-[0_5px_0_0_#0F172A] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-xl border-2 border-slate-900 ${tttCatalog.accentBg} ${tttCatalog.accentText} flex items-center justify-center shrink-0`}
                >
                  <GameIcon gameId="tictactoe" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="font-display text-2xl font-bold text-slate-900">
                      {tttCatalog.name}
                    </h1>
                    <span className="px-2 py-0.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 whitespace-nowrap">
                      {tttCatalog.shortTag}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{tttCatalog.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSwitcher(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
              >
                <LayoutGrid className="w-4 h-4" />
                Switch Game
              </button>
            </div>

            {/* Online Play Locked Banner */}
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Online Multiplayer Requires Sign-In
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                    Sign in with Google to challenge real players online, join public rooms, add friends, and track leaderboard stats. Offline Pass &amp; Play and Solo vs Bot are unlocked for all 11 games right now!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                {authBusy ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>

            {/* Offline Modes for Tic-Tac-Toe */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <section className="lg:col-span-5 bg-rose-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-rose-600" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Play Together in Person
                    </h2>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                    Hand the device back and forth with a friend right next to you. Custom player names and round scoreboard included.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTttLocalMode(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-900 bg-rose-500 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-rose-600 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  Start Pass &amp; Play
                </button>
              </section>

              <section className="lg:col-span-7 bg-sky-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-7 shadow-[0_5px_0_0_#0F172A] flex flex-col justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Practice Alone vs Bot
                    </h2>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                    Play solo against our arcade AI — pick your difficulty and mark without signing in.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-white border-2 border-slate-900 rounded-xl">
                    {(['casual', 'tactical', 'unbeatable'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTttBotDifficulty(level)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize cursor-pointer transition-colors whitespace-nowrap ${
                          tttBotDifficulty === level
                            ? 'bg-amber-300 text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-white border-2 border-slate-900 rounded-xl">
                    {(['X', 'O'] as const).map((mark) => (
                      <button
                        key={mark}
                        type="button"
                        onClick={() => setTttBotMark(mark)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                          tttBotMark === mark
                            ? 'bg-amber-300 text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Play {mark}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setTttBotMode(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-900 text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-amber-100 active:translate-y-[2px] active:shadow-none cursor-pointer whitespace-nowrap"
                  >
                    <Bot className="w-4 h-4" />
                    Play vs Bot
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
