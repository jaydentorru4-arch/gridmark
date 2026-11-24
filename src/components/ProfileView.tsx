import { useState, type FormEvent } from 'react';
import { signOut } from 'firebase/auth';
import { Check, Copy, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { computeWinRate, validateProfileInput } from '../lib/gameLogic';
import { updatePlayerProfile } from '../services/firestoreService';
import {
  AVATAR_IDS,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  USERNAME_MAX,
  type AvatarId,
  type PlayerProfile,
} from '../types/game';
import { AVATAR_STYLES, AvatarBadge } from './AvatarBadge';

interface ProfileViewProps {
  profile: PlayerProfile;
  email: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function ProfileView({
  profile,
  email,
  soundEnabled,
  onToggleSound,
}: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState<AvatarId>(profile.avatarId);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const winRate = computeWinRate(profile.wins, profile.gamesPlayed);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMsg('');
    const err = validateProfileInput({ username, displayName, bio });
    if (err) {
      setErrorMsg(err);
      return;
    }
    setSaving(true);
    try {
      await updatePlayerProfile(profile.uid, {
        username,
        displayName,
        avatarId,
        bio,
      });
      setSavedMsg('Profile changes saved.');
    } catch (e2) {
      setErrorMsg(e2 instanceof Error ? e2.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-8">
      {/* Player Stats Overview */}
      <section className="bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarBadge avatarId={profile.avatarId} name={profile.displayName} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {profile.displayName}
              </h1>
              <p className="text-sm text-slate-500">
                @{profile.username}
                {email ? (
                  <>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    {email}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-800 shadow-[0_2px_0_0_#0F172A] hover:bg-rose-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
          <div>
            <p className="text-xs text-slate-500">Wins</p>
            <p className="font-display text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
              {profile.wins}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Losses</p>
            <p className="font-display text-2xl font-bold text-rose-700 tabular-nums mt-0.5">
              {profile.losses}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Draws</p>
            <p className="font-display text-2xl font-bold text-slate-700 tabular-nums mt-0.5">
              {profile.draws}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Win Rate</p>
            <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
              {winRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Current Streak</p>
            <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
              {profile.winStreak}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Leaderboard Pts</p>
            <p className="font-display text-2xl font-bold text-blue-600 tabular-nums mt-0.5">
              {profile.points}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Management Form */}
        <section className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
          <h2 className="font-display text-lg font-bold text-slate-900">Edit Profile</h2>
          <p className="mt-1 text-xs text-slate-500">
            Update your public player name, handle, emblem color, or bio.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Player Emblem
              </label>
              <div className="grid grid-cols-6 gap-2.5">
                {AVATAR_IDS.map((id) => {
                  const style = AVATAR_STYLES[id];
                  const selected = avatarId === id;
                  const letter = (displayName.trim()[0] || 'G').toUpperCase();
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatarId(id)}
                      className={`h-11 rounded-lg ${style.bg} ${style.fg} font-display font-bold text-base flex items-center justify-center cursor-pointer transition-transform duration-150 ${
                        selected ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`Select ${style.label} emblem`}
                    >
                      {selected ? <Check className="w-4 h-4" /> : letter}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-display-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  maxLength={DISPLAY_NAME_MAX}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="profile-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  id="profile-username"
                  type="text"
                  required
                  maxLength={USERNAME_MAX}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bio
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                maxLength={BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your playstyle or opening strategy..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                {errorMsg}
              </p>
            )}
            {savedMsg && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
                {savedMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Preferences & Shareable URL */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
            <h2 className="font-display text-base font-bold text-slate-900">Preferences</h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Board Sound Effects</p>
                <p className="text-xs text-slate-500">Play subtle chimes on moves and match end</p>
              </div>
              <button
                type="button"
                onClick={onToggleSound}
                className={`px-3.5 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] active:translate-y-[1px] active:shadow-none cursor-pointer transition-colors ${
                  soundEnabled
                    ? 'bg-amber-300 text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>

          <div className="bg-sky-50 border-2 border-slate-900 rounded-2xl p-6 shadow-[0_5px_0_0_#0F172A]">
            <h2 className="font-display text-base font-bold text-slate-900">Share Gridmark</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Share this URL with other players so they can create an account and challenge you online.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Shareable application URL"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-slate-900 bg-white font-mono text-xs text-slate-800"
              />
              <button
                type="button"
                onClick={handleCopyAppUrl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
