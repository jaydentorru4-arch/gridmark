import { useState, type FormEvent } from 'react';
import { signOut } from 'firebase/auth';
import { Check, Copy, LogOut, Palette, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { computeWinRate, validateProfileInput } from '../lib/gameLogic';
import { updatePlayerProfile } from '../services/firestoreService';
import {
  AVATAR_IDS,
  BANNER_THEME_IDS,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  EMBLEM_ICON_IDS,
  PLAYER_TITLE_MAX,
  USERNAME_MAX,
  type AvatarId,
  type BannerThemeId,
  type EmblemIconId,
  type PlayerProfile,
} from '../types/game';
import {
  AVATAR_STYLES,
  AvatarBadge,
  BANNER_THEME_STYLES,
  EMBLEM_LABELS,
  EmblemGlyph,
} from './AvatarBadge';

interface ProfileViewProps {
  profile: PlayerProfile;
  email: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const PRESET_TITLES = [
  'Challenger',
  'Grandmaster',
  'Chill Vibes',
  'Arcade Legend',
  'Night Owl',
];

export function ProfileView({
  profile,
  email,
  soundEnabled,
  onToggleSound,
}: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState<AvatarId>(profile.avatarId);
  const [emblemIcon, setEmblemIcon] = useState<EmblemIconId>(profile.emblemIcon || 'letter');
  const [bannerTheme, setBannerTheme] = useState<BannerThemeId>(profile.bannerTheme || 'classic');
  const [playerTitle, setPlayerTitle] = useState(profile.playerTitle || '');
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const winRate = computeWinRate(profile.wins, profile.gamesPlayed);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeBanner = BANNER_THEME_STYLES[bannerTheme] ?? BANNER_THEME_STYLES.classic;
  const previewName = displayName.trim() || profile.displayName;
  const previewUsername = username.trim() || profile.username;
  const previewTitle = playerTitle.trim();

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedMsg('');
    const err = validateProfileInput({ username, displayName, bio, playerTitle });
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
        emblemIcon,
        bannerTheme,
        playerTitle,
      });
      setSavedMsg('Profile customization saved.');
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
      {/* Live Customized Player Card & Stats Overview */}
      <section
        className={`${activeBanner.cardBg} border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A] transition-colors duration-200`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <AvatarBadge
              avatarId={avatarId}
              name={previewName}
              emblemIcon={emblemIcon}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`font-display text-2xl font-bold truncate ${activeBanner.text}`}>
                  {previewName}
                </h1>
                {previewTitle && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-900 text-xs font-bold ${activeBanner.badgeBg} ${activeBanner.badgeText}`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {previewTitle}
                  </span>
                )}
              </div>
              <p className={`text-sm ${activeBanner.subText}`}>
                @{previewUsername}
                {email ? (
                  <>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    {email}
                  </>
                ) : null}
              </p>
              {bio.trim() && (
                <p className={`mt-1.5 text-xs max-w-xl ${activeBanner.subText}`}>
                  {bio.trim()}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-slate-900 bg-white text-sm font-bold text-slate-800 shadow-[0_2px_0_0_#0F172A] hover:bg-rose-50 active:translate-y-[1px] active:shadow-none cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div
          className={`mt-8 pt-6 border-t-2 ${
            bannerTheme === 'slate' ? 'border-slate-700' : 'border-slate-900/10'
          } grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6`}
        >
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Wins</p>
            <p
              className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${
                bannerTheme === 'slate' ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              {profile.wins}
            </p>
          </div>
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Losses</p>
            <p
              className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${
                bannerTheme === 'slate' ? 'text-rose-400' : 'text-rose-700'
              }`}
            >
              {profile.losses}
            </p>
          </div>
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Draws</p>
            <p className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${activeBanner.text}`}>
              {profile.draws}
            </p>
          </div>
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Win Rate</p>
            <p className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${activeBanner.text}`}>
              {winRate}%
            </p>
          </div>
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Current Streak</p>
            <p className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${activeBanner.text}`}>
              {profile.winStreak}
            </p>
          </div>
          <div>
            <p className={`text-xs ${activeBanner.subText}`}>Leaderboard Pts</p>
            <p
              className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${
                bannerTheme === 'slate' ? 'text-amber-300' : 'text-blue-600'
              }`}
            >
              {profile.points}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Customisation Form */}
        <section className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-6 sm:p-8 shadow-[0_5px_0_0_#0F172A]">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Customise Profile
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Personalize your badge color, emblem icon, card banner, title tag, and player bio.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            {/* Avatar Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Badge Color
              </label>
              <div className="grid grid-cols-6 gap-2.5">
                {AVATAR_IDS.map((id) => {
                  const style = AVATAR_STYLES[id];
                  const selected = avatarId === id;
                  const letter = (previewName[0] || 'G').toUpperCase();
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatarId(id)}
                      className={`h-11 rounded-lg ${style.bg} ${style.fg} font-display font-bold text-base flex items-center justify-center cursor-pointer transition-transform duration-150 ${
                        selected ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`Select ${style.label} badge color`}
                    >
                      {selected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <EmblemGlyph emblemIcon={emblemIcon} initial={letter} className="w-5 h-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emblem Icon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Emblem Icon
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {EMBLEM_ICON_IDS.map((iconId) => {
                  const selected = emblemIcon === iconId;
                  const colorStyle = AVATAR_STYLES[avatarId];
                  const letter = (previewName[0] || 'G').toUpperCase();
                  return (
                    <button
                      key={iconId}
                      type="button"
                      onClick={() => setEmblemIcon(iconId)}
                      title={EMBLEM_LABELS[iconId]}
                      aria-label={`Select ${EMBLEM_LABELS[iconId]} emblem icon`}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-slate-900 bg-amber-100 shadow-[0_2px_0_0_#0F172A]'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg ${colorStyle.bg} ${colorStyle.fg} flex items-center justify-center font-display text-xs font-bold`}
                      >
                        <EmblemGlyph emblemIcon={iconId} initial={letter} className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {EMBLEM_LABELS[iconId]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Banner Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Profile Card Theme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BANNER_THEME_IDS.map((themeId) => {
                  const meta = BANNER_THEME_STYLES[themeId];
                  const selected = bannerTheme === themeId;
                  return (
                    <button
                      key={themeId}
                      type="button"
                      onClick={() => setBannerTheme(themeId)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        selected
                          ? 'border-slate-900 bg-amber-50 shadow-[0_2px_0_0_#0F172A]'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md border border-slate-900 shrink-0 ${meta.swatchBg}`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Player Title Tag */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="profile-title" className="block text-xs font-semibold text-slate-700">
                  Player Title
                </label>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {playerTitle.length}/{PLAYER_TITLE_MAX}
                </span>
              </div>
              <input
                id="profile-title"
                type="text"
                maxLength={PLAYER_TITLE_MAX}
                value={playerTitle}
                onChange={(e) => setPlayerTitle(e.target.value)}
                placeholder="e.g. Grandmaster, Chill Vibes..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_TITLES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPlayerTitle(preset)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                      playerTitle === preset
                        ? 'border-slate-900 bg-amber-300 text-slate-900'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-amber-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {playerTitle && (
                  <button
                    type="button"
                    onClick={() => setPlayerTitle('')}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
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
