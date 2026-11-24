import { useEffect, useState, type FormEvent } from 'react';
import {
  reload,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Bot, Check, LogOut, Mail, RefreshCw, Users } from 'lucide-react';
import { auth, FIREBASE_PROJECT_ID, googleProvider } from '../lib/firebase';
import { sanitizeUsername, validateProfileInput } from '../lib/gameLogic';
import { soundFx } from '../lib/sound';
import { registerPlayerProfile } from '../services/firestoreService';
import { AVATAR_IDS, BIO_MAX, DISPLAY_NAME_MAX, USERNAME_MAX, type AvatarId } from '../types/game';
import { AVATAR_STYLES } from './AvatarBadge';
import { BotGameBoard } from './BotGameBoard';
import { LocalGameBoard } from './LocalGameBoard';

export const REDIRECT_FLAG_KEY = 'gridmark_pending_redirect';

interface AuthScreenProps {
  firebaseUser: FirebaseUser | null;
  needsProfileSetup: boolean;
  pendingInviteCode: string;
  initialError?: string;
  onProfileCreated: () => void;
}

function formatReadableError(err: unknown, currentHost: string, fallback: string): string {
  const code = (err as { code?: string })?.code || '';
  const rawMsg = err instanceof Error ? err.message : fallback;

  try {
    const parsed = JSON.parse(rawMsg) as { error?: string; operationType?: string; path?: string };
    if (parsed.error) {
      if (parsed.error.includes('Missing or insufficient permissions')) {
        return `Firestore permission denied (${parsed.path || parsed.operationType || 'write'}). Please sign out and sign back in, then try again.`;
      }
      return parsed.error;
    }
  } catch {
    // Not a JSON FirestoreErrorInfo string
  }

  if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
    return `This domain (${currentHost}) is not yet authorized in Firebase Authentication. Add "${currentHost}" under Firebase Console → Authentication → Settings → Authorized domains (project: ${FIREBASE_PROJECT_ID}).`;
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Allow popups for this site or use the redirect sign-in option below.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while reaching Firebase Authentication. Check your connection and try again.';
  }
  return rawMsg || fallback;
}

export function AuthScreen({
  firebaseUser,
  needsProfileSetup,
  pendingInviteCode,
  initialError = '',
  onProfileCreated,
}: AuthScreenProps) {
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [infoMsg, setInfoMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Onboarding profile state
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '');
  const [username, setUsername] = useState(
    sanitizeUsername(firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'player'),
  );
  const [avatarId, setAvatarId] = useState<AvatarId>('cobalt');
  const [bio, setBio] = useState('');
  const [soloBotOpen, setSoloBotOpen] = useState(false);
  const [localFriendOpen, setLocalFriendOpen] = useState(false);
  const [soloSoundEnabled, setSoloSoundEnabled] = useState(true);

  const isStandaloneWindow = typeof window !== 'undefined' && window.self === window.top;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    if (initialError) {
      setErrorMsg(formatReadableError(new Error(initialError), currentHost, initialError));
    }
  }, [initialError, currentHost]);

  useEffect(() => {
    if (!firebaseUser) return;
    if (!displayName && firebaseUser.displayName) {
      setDisplayName(firebaseUser.displayName);
    }
    if (username === 'player' && (firebaseUser.displayName || firebaseUser.email)) {
      setUsername(
        sanitizeUsername(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'player'),
      );
    }
  }, [firebaseUser?.uid, firebaseUser?.displayName, firebaseUser?.email]);

  if (localFriendOpen) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6">
        <LocalGameBoard
          soundEnabled={soloSoundEnabled}
          onToggleSound={() => {
            const next = !soloSoundEnabled;
            setSoloSoundEnabled(next);
            soundFx.setEnabled(next);
          }}
          onBack={() => setLocalFriendOpen(false)}
        />
      </div>
    );
  }

  if (soloBotOpen) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6">
        <BotGameBoard
          playerName="Guest Player"
          playerAvatar="cobalt"
          soundEnabled={soloSoundEnabled}
          onToggleSound={() => {
            const next = !soloSoundEnabled;
            setSoloSoundEnabled(next);
            soundFx.setEnabled(next);
          }}
          onBack={() => setSoloBotOpen(false)}
        />
      </div>
    );
  }

  const startRedirectSignIn = async () => {
    try {
      sessionStorage.setItem(REDIRECT_FLAG_KEY, '1');
    } catch {
      // Ignore storage errors
    }
    await signInWithRedirect(auth, googleProvider);
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (
        isStandaloneWindow &&
        (code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/web-storage-unsupported')
      ) {
        try {
          await startRedirectSignIn();
          return;
        } catch (redirectErr) {
          setErrorMsg(formatReadableError(redirectErr, currentHost, 'Google sign-in failed.'));
        }
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setErrorMsg(formatReadableError(err, currentHost, 'Google sign-in failed.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleRedirectAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await startRedirectSignIn();
    } catch (err) {
      setErrorMsg(formatReadableError(err, currentHost, 'Google redirect sign-in failed.'));
      setBusy(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setErrorMsg('');
    try {
      await reload(firebaseUser);
      if (!auth.currentUser?.emailVerified) {
        setErrorMsg('Email is still unverified. Click the link in your inbox, then try again.');
      } else {
        await auth.currentUser.getIdToken(true);
        onProfileCreated();
      }
    } catch (err) {
      setErrorMsg(formatReadableError(err, currentHost, 'Could not refresh verification status.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    setErrorMsg('');
    try {
      await sendEmailVerification(firebaseUser);
      setInfoMsg('Verification link re-sent to your email.');
    } catch (err) {
      setErrorMsg(formatReadableError(err, currentHost, 'Could not resend verification email.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setErrorMsg('');
    const validationErr = validateProfileInput({ username, displayName, bio });
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }
    setBusy(true);
    try {
      await registerPlayerProfile(firebaseUser.uid, firebaseUser.email || '', {
        username,
        displayName,
        avatarId,
        bio,
      });
      onProfileCreated();
    } catch (err) {
      setErrorMsg(formatReadableError(err, currentHost, 'Failed to create player profile.'));
    } finally {
      setBusy(false);
    }
  };

  // Case A: Signed in but email not verified yet
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_6px_0_0_#0F172A]">
          <div className="w-11 h-11 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 flex items-center justify-center mb-5">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
            Verify your email address
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            We sent a verification link to <span className="font-semibold text-slate-900">{firebaseUser.email}</span>.
            Confirm your email so your player profile and match stats can sync securely.
          </p>

          {errorMsg && (
            <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
              {infoMsg}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleRefreshVerification}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              I have verified my email
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-800 text-sm font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-50 active:translate-y-[1px] active:shadow-none cursor-pointer"
            >
              Resend verification email
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out and switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case B: Authenticated & verified, completing first-time player profile
  if (firebaseUser && needsProfileSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_6px_0_0_#0F172A]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Create your player card
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose how opponents see you in rooms and on the leaderboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              Sign out
            </button>
          </div>

          <form onSubmit={handleCreateProfile} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Player Emblem
              </label>
              <div className="grid grid-cols-6 gap-2.5">
                {AVATAR_IDS.map((id) => {
                  const style = AVATAR_STYLES[id];
                  const selected = avatarId === id;
                  const letter = (displayName.trim()[0] || username.trim()[0] || 'G').toUpperCase();
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
                <label htmlFor="setup-display-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="setup-display-name"
                  type="text"
                  required
                  maxLength={DISPLAY_NAME_MAX}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label htmlFor="setup-username" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  id="setup-username"
                  type="text"
                  required
                  maxLength={USERNAME_MAX}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_r"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="setup-bio" className="block text-sm font-medium text-slate-700 mb-1.5">
                Bio (optional)
              </label>
              <input
                id="setup-bio"
                type="text"
                maxLength={BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Center square opener."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-5 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
            >
              {busy ? 'Creating Profile...' : pendingInviteCode ? `Enter Room ${pendingInviteCode}` : 'Enter Lobby'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case C: Unauthenticated Sign In View
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Editorial / Board Preview Panel */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-900 rounded-2xl p-8 sm:p-10 shadow-[0_6px_0_0_#0F172A] flex flex-col justify-between">
          <div>
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Gridmark
            </span>
            <h1 className="mt-5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-[1.15]">
              Tic-Tac-Toe, built for fast matches with friends.
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-xl">
              Challenge friends online with 6-character room codes, pass the phone in person, or warm up solo against the Bot.
            </p>
            {pendingInviteCode && (
              <p className="mt-4 text-sm font-semibold text-blue-800 bg-sky-50 border-2 border-slate-900 rounded-xl px-4 py-2.5">
                Invite ready · Sign in to join room{' '}
                <span className="font-mono font-bold">{pendingInviteCode}</span>
              </p>
            )}
          </div>

          {/* Static Decorative 3x3 Tabletop Specimen */}
          <div className="mt-8 pt-8 border-t-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-2 w-44 p-2.5 rounded-2xl bg-amber-100/80 border-2 border-slate-900 shadow-[0_4px_0_0_#0F172A] shrink-0" aria-hidden="true">
              {(['X', 'O', '', 'O', 'X', '', '', '', 'X'] as const).map((mark, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg border-2 border-slate-900 flex items-center justify-center font-display font-bold text-lg ${
                    idx === 0 || idx === 4 || idx === 8
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white text-slate-700'
                  }`}
                >
                  {mark === 'X' ? (
                    <span className="text-rose-500">X</span>
                  ) : mark === 'O' ? (
                    <span className="text-blue-600">O</span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600">
              <div>
                <p className="font-bold text-slate-900">Invite Codes</p>
                <p className="text-xs text-slate-500 mt-0.5">Instant shareable links</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Pass & Play</p>
                <p className="text-xs text-slate-500 mt-0.5">Play in person on one screen</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Bot Arena</p>
                <p className="text-xs text-slate-500 mt-0.5">Casual to Unbeatable AI</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Live Leaderboard</p>
                <p className="text-xs text-slate-500 mt-0.5">3 pts win · 1 pt draw</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In Card */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_6px_0_0_#0F172A] flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Jump online
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Sign in or create your Gridmark player card with Google to unlock live multiplayer rooms, direct challenges, and ranked leaderboards.
            </p>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={busy}
              className="mt-6 w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
            >
              <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
              </span>
              {busy ? 'Signing in...' : 'Continue with Google'}
            </button>

            {isStandaloneWindow && (
              <button
                type="button"
                onClick={handleGoogleRedirectAuth}
                disabled={busy}
                className="mt-3 w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Popup blocked? Sign in with Google redirect instead
              </button>
            )}

            {errorMsg && (
              <p className="mt-4 text-xs font-medium text-rose-700 bg-rose-50 border-2 border-rose-300 rounded-xl px-3.5 py-2.5 leading-relaxed break-words">
                {errorMsg}
              </p>
            )}
            {infoMsg && (
              <p className="mt-4 text-xs font-medium text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3.5 py-2.5 leading-relaxed">
                {infoMsg}
              </p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t-2 border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-700">Or play right now without signing in</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLocalFriendOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 border-slate-900 bg-rose-500 text-white text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-rose-600 active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5" />
                Pass & Play (Friend)
              </button>
              <button
                type="button"
                onClick={() => setSoloBotOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                <Bot className="w-3.5 h-3.5" />
                Solo vs Bot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
