import { useState, type FormEvent } from 'react';
import { ArrowRight, Bot, Plus, Swords } from 'lucide-react';
import type { BotDifficulty } from '../lib/botAi';
import { formatRelativeTime, normalizeInviteCode } from '../lib/gameLogic';
import {
  createGameRoom,
  joinGameRoom,
  resolveInviteCode,
  sendChallenge,
} from '../services/firestoreService';
import type { Challenge, GameMark, GameRoom, GameVisibility, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';
import { BotGameBoard } from './BotGameBoard';
import { GameBoard } from './GameBoard';

interface PlayViewProps {
  currentUser: PlayerProfile;
  activeRoom: GameRoom | null;
  openRooms: GameRoom[];
  myActiveGames: GameRoom[];
  onlinePlayers: PlayerProfile[];
  outgoingChallenges: Challenge[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenGame: (gameId: string) => void;
  onLeaveRoom: () => void;
}

export function PlayView({
  currentUser,
  activeRoom,
  openRooms,
  myActiveGames,
  onlinePlayers,
  outgoingChallenges,
  soundEnabled,
  onToggleSound,
  onOpenGame,
  onLeaveRoom,
}: PlayViewProps) {
  const [visibility, setVisibility] = useState<GameVisibility>('public');
  const [joinCode, setJoinCode] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [challengingUid, setChallengingUid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [challengeNotice, setChallengeNotice] = useState('');
  const [botMode, setBotMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('tactical');
  const [botPlayerMark, setBotPlayerMark] = useState<GameMark>('X');

  if (activeRoom) {
    return (
      <GameBoard
        room={activeRoom}
        currentUser={currentUser}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onOpenGame={onOpenGame}
        onLeaveToLobby={onLeaveRoom}
      />
    );
  }

  if (botMode) {
    return (
      <BotGameBoard
        playerName={currentUser.displayName}
        playerAvatar={currentUser.avatarId}
        initialDifficulty={botDifficulty}
        initialMark={botPlayerMark}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onBack={() => setBotMode(false)}
      />
    );
  }

  const handleCreateRoom = async () => {
    setErrorMsg('');
    setBusyCreate(true);
    try {
      const { gameId } = await createGameRoom(currentUser, visibility);
      onOpenGame(gameId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setBusyCreate(false);
    }
  };

  const handleJoinByCode = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBusyJoin(true);
    try {
      const gameId = await resolveInviteCode(joinCode);
      await joinGameRoom(gameId, currentUser);
      setJoinCode('');
      onOpenGame(gameId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setBusyJoin(false);
    }
  };

  const handleJoinPublicRoom = async (room: GameRoom) => {
    setErrorMsg('');
    setJoiningId(room.id);
    try {
      await joinGameRoom(room.id, currentUser);
      onOpenGame(room.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleSendChallenge = async (target: PlayerProfile) => {
    setErrorMsg('');
    setChallengeNotice('');
    setChallengingUid(target.uid);
    try {
      await sendChallenge(currentUser, target);
      setChallengeNotice(`Challenge sent to ${target.displayName}. You will enter the match automatically once they accept.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send challenge.');
    } finally {
      setChallengingUid(null);
    }
  };

  const availablePublicRooms = openRooms.filter((r) => r.playerXUid !== currentUser.uid);
  const pendingTargetUids = new Set(
    outgoingChallenges.filter((c) => c.status === 'pending').map((c) => c.targetUid),
  );
  const opponents = onlinePlayers.filter((p) => p.uid !== currentUser.uid);

  return (
    <div className="space-y-8">
      {/* Primary Two-Column Lobby */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Focal Anchor: Create or Join Room */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
              Start or join a match
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Open a public table for anyone in the lobby or generate a private 6-character invite code.
            </p>

            {/* Visibility Segmented Control */}
            <div className="mt-6">
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Room Visibility
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`py-2 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                    visibility === 'public'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Public Lobby
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`py-2 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                    visibility === 'private'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Private Invite
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={busyCreate}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {busyCreate
                ? 'Creating Room...'
                : visibility === 'public'
                  ? 'Create Public Room'
                  : 'Create Private Room'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <form onSubmit={handleJoinByCode} className="space-y-2.5">
              <label htmlFor="invite-code-input" className="block text-xs font-semibold text-slate-700">
                Join with Invite Code
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  id="invite-code-input"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(normalizeInviteCode(e.target.value))}
                  placeholder="K7M9P2"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-sm font-semibold tracking-widest uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={busyJoin || joinCode.length !== 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {busyJoin ? 'Joining...' : 'Join'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {errorMsg && (
              <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}
            {challengeNotice && (
              <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {challengeNotice}
              </p>
            )}
          </div>
        </div>

        {/* Right: Open Public Rooms & Resume Active Matches */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col">
          {myActiveGames.length > 0 && (
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h2 className="font-display text-base font-bold text-slate-900">
                Your Active Rooms
              </h2>
              <div className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {myActiveGames.map((game) => {
                  const opponentName =
                    game.playerXUid === currentUser.uid
                      ? game.playerOName || 'Waiting for opponent'
                      : game.playerXName;
                  const myTurn =
                    game.status === 'playing' &&
                    ((game.currentTurn === 'X' && game.playerXUid === currentUser.uid) ||
                      (game.currentTurn === 'O' && game.playerOUid === currentUser.uid));
                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {game.status === 'waiting' ? 'Open Room' : `vs ${opponentName}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono">{game.inviteCode}</span>
                          <span aria-hidden="true" className="mx-1.5">·</span>
                          {game.status === 'waiting'
                            ? 'Waiting for player'
                            : myTurn
                              ? 'Your turn'
                              : 'Opponent turn'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenGame(game.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Resume
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Open Lobby Rooms
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Public tables ready for an opponent
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              {availablePublicRooms.length} open
            </span>
          </div>

          {availablePublicRooms.length === 0 ? (
            <div className="mt-6 flex-1 min-h-[180px] rounded-lg border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-slate-700">No open public rooms right now</p>
              <p className="mt-1 text-xs text-slate-500">
                Create a public room on the left or challenge an online player below.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {availablePublicRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={room.playerXAvatar} name={room.playerXName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {room.playerXName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Code <span className="font-mono font-medium text-slate-700">{room.inviteCode}</span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {formatRelativeTime(room.createdAt?.toDate() ?? null)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinPublicRoom(room)}
                    disabled={joiningId === room.id}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {joiningId === room.id ? 'Joining...' : 'Join Match'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Solo Practice vs Bot */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-lg">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-slate-900" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Practice Alone vs Bot
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Play solo against an offline AI opponent to test openings or warm up without affecting leaderboard points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['casual', 'tactical', 'unbeatable'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setBotDifficulty(level)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer transition-colors whitespace-nowrap ${
                  botDifficulty === level
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['X', 'O'] as const).map((mark) => (
              <button
                key={mark}
                type="button"
                onClick={() => setBotPlayerMark(mark)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                  botPlayerMark === mark
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Play {mark}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setBotMode(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            Play vs Bot
          </button>
        </div>
      </section>

      {/* Online Players Directory for Direct Challenges */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Players Online
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Send a direct match challenge to any active player
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {opponents.length} available
          </span>
        </div>

        {opponents.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No other players are currently active in the lobby. Share a room invite link to invite friends.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opponents.map((player) => {
              const alreadyChallenged = pendingTargetUids.has(player.uid);
              return (
                <div
                  key={player.uid}
                  className="flex items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={player.avatarId} name={player.displayName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {player.displayName}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums truncate">
                        @{player.username}
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {player.wins}W-{player.losses}L-{player.draws}D
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyChallenged || challengingUid === player.uid}
                    onClick={() => handleSendChallenge(player)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      alreadyChallenged
                        ? 'bg-slate-100 text-slate-500 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    {alreadyChallenged
                      ? 'Pending'
                      : challengingUid === player.uid
                        ? 'Sending...'
                        : 'Challenge'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
