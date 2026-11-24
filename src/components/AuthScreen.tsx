import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Bot, Check, LogOut, Mail, RefreshCw } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { sanitizeUsername, validateProfileInput } from '../lib/gameLogic';
import { soundFx } from '../lib/sound';
import { registerPlayerProfile } from '../services/firestoreService';
import { AVATAR_IDS, BIO_MAX, DISPLAY_NAME_MAX, USERNAME_MAX, type AvatarId } from '../types/game';
import { AVATAR_STYLES } from './AvatarBadge';
import { BotGameBoard } from './BotGameBoard';

interface AuthScreenProps {
  firebaseUser: FirebaseUser | null;
  needsProfileSetup: boolean;
  pendingInviteCode: string;
  onProfileCreated: () => void;
}

export function AuthScreen({
  firebaseUser,
  needsProfileSetup,
  pendingInviteCode,
  onProfileCreated,
}: AuthScreenProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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
  const [soloSoundEnabled, setSoloSoundEnabled] = useState(true);

  if (soloBotOpen) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] py-8 px-4 sm:px-6">
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

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (!msg.includes('popup-closed-by-user')) {
        setErrorMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim() || password.length < 6) {
      setErrorMsg('Please enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (authTab === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(cred.user);
        setInfoMsg('Verification email sent. Please check your inbox and verify before continuing.');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). Use Continue with Google above for instant access, or enable Email/Password in Firebase Console.',
        );
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Switch to Sign In.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setErrorMsg('Incorrect email or password.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
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
        onProfileCreated();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not refresh verification status.');
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
      setErrorMsg(err instanceof Error ? err.message : 'Could not resend verification email.');
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create player profile.');
    } finally {
      setBusy(false);
    }
  };

  // Case A: Signed in via Email/Password but email not verified yet
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              I have verified my email
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={busy}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 cursor-pointer"
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
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
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
              className="w-full py-2.5 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy ? 'Creating Profile...' : pendingInviteCode ? `Enter Room ${pendingInviteCode}` : 'Enter Lobby'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case C: Unauthenticated Sign In / Registration View
  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Editorial / Board Preview Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              Gridmark
            </span>
            <h1 className="mt-6 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-[1.15]">
              Real-time Tic-Tac-Toe built for head-to-head matches.
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-xl">
              Create private invite rooms, challenge classmates online, track every match in your history, and climb the live points leaderboard.
            </p>
            {pendingInviteCode && (
              <p className="mt-4 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                Invite ready · Sign in to join room{' '}
                <span className="font-mono font-bold">{pendingInviteCode}</span>
              </p>
            )}
          </div>

          {/* Static Decorative 3x3 Tabletop Specimen */}
          <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-2 w-40 shrink-0" aria-hidden="true">
              {(['X', 'O', '', 'O', 'X', '', '', '', 'X'] as const).map((mark, idx) => (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg border flex items-center justify-center font-display font-bold text-lg ${
                    idx === 0 || idx === 4 || idx === 8
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {mark === 'X' ? (
                    <span className="text-rose-600">X</span>
                  ) : mark === 'O' ? (
                    <span className="text-blue-600">O</span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">6-char Invite Codes</p>
                <p className="text-xs text-slate-500 mt-0.5">Instant shareable room links</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Live Sync</p>
                <p className="text-xs text-slate-500 mt-0.5">Sub-second Cloud Firestore state</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Direct Challenges</p>
                <p className="text-xs text-slate-500 mt-0.5">Duel any online player</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Ranked Scoring</p>
                <p className="text-xs text-slate-500 mt-0.5">3 pts win · 1 pt draw</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In / Register Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-center">
          <h2 className="font-display text-xl font-bold text-slate-900">
            {authTab === 'login' ? 'Sign in to play' : 'Create an account'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Use Google for one-click access or register with email.
          </p>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setErrorMsg('');
              }}
              className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                authTab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setErrorMsg('');
              }}
              className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                authTab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 leading-relaxed">
                {errorMsg}
              </p>
            )}
            {infoMsg && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 leading-relaxed">
                {infoMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy
                ? 'Please wait...'
                : authTab === 'login'
                  ? 'Sign In with Email'
                  : 'Create Email Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setSoloBotOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              Practice Alone vs Bot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
