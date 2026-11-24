import { useState } from 'react';
import { Check, Swords, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/gameLogic';
import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
} from '../services/firestoreService';
import type { Challenge, PlayerProfile } from '../types/game';
import { AvatarBadge } from './AvatarBadge';

interface ChallengesViewProps {
  currentUser: PlayerProfile;
  incomingChallenges: Challenge[];
  outgoingChallenges: Challenge[];
  onEnterGame: (gameId: string) => void;
}

export function ChallengesView({
  currentUser,
  incomingChallenges,
  outgoingChallenges,
  onEnterGame,
}: ChallengesViewProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pendingIncoming = incomingChallenges.filter((c) => c.status === 'pending');
  const pastIncoming = incomingChallenges.filter((c) => c.status !== 'pending');
  const pendingOutgoing = outgoingChallenges.filter((c) => c.status === 'pending');

  const handleAccept = async (challenge: Challenge) => {
    setErrorMsg('');
    setBusyId(challenge.id);
    try {
      const gameId = await acceptChallenge(challenge, currentUser);
      onEnterGame(gameId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (challengeId: string) => {
    setErrorMsg('');
    setBusyId(challengeId);
    try {
      await declineChallenge(challengeId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to decline challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (challengeId: string) => {
    setErrorMsg('');
    setBusyId(challengeId);
    try {
      await cancelChallenge(challengeId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel challenge.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Direct Challenges</h1>
        <p className="mt-1 text-sm text-slate-600">
          Respond to invitations from other players or track challenges you have sent.
        </p>
      </div>

      {errorMsg && (
        <p className="text-sm font-medium text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3">
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Incoming Challenges */}
        <section className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Incoming</h2>
            <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
              {pendingIncoming.length} pending
            </span>
          </div>

          {pendingIncoming.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-amber-50/40 p-6 text-center">
              <Swords className="w-5 h-5 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No incoming challenges</p>
              <p className="mt-1 text-xs text-slate-500">
                When another player challenges you from the lobby, it appears here in real time.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
              {pendingIncoming.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge avatarId={c.challengerAvatar} name={c.challengerName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {c.challengerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Challenged you · {formatRelativeTime(c.createdAt?.toDate() ?? null)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleDecline(c.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-800 shadow-[0_2px_0_0_#0F172A] hover:bg-slate-100 active:translate-y-[1px] active:shadow-none cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleAccept(c)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[1px] active:shadow-none cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastIncoming.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Recent Responses</h3>
              <div className="space-y-2.5">
                {pastIncoming.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700 truncate">
                      From <span className="font-semibold text-slate-900">{c.challengerName}</span>
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500 capitalize">{c.status}</span>
                      {c.status === 'accepted' && c.gameId && (
                        <button
                          type="button"
                          onClick={() => onEnterGame(c.gameId)}
                          className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          Open Room
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Outgoing Challenges */}
        <section className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-slate-900">Sent Challenges</h2>
            <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
              {pendingOutgoing.length} active
            </span>
          </div>

          {outgoingChallenges.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-amber-50/40 p-6 text-center">
              <p className="text-sm font-bold text-slate-800">No challenges sent</p>
              <p className="mt-1 text-xs text-slate-500">
                Select any online player in the Play lobby to send a direct duel.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-2 border-slate-900 rounded-xl overflow-hidden">
              {outgoingChallenges.slice(0, 10).map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {c.targetName}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {c.status} · {formatRelativeTime(c.createdAt?.toDate() ?? null)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {c.status === 'pending' && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleCancel(c.id)}
                        className="px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-bold text-slate-800 shadow-[0_2px_0_0_#0F172A] hover:bg-slate-100 active:translate-y-[1px] active:shadow-none cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    {c.status === 'accepted' && c.gameId && (
                      <button
                        type="button"
                        onClick={() => onEnterGame(c.gameId)}
                        className="px-3.5 py-1.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer"
                      >
                        Enter Match
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
