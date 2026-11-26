import { Component, type ErrorInfo, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { ExternalLink, LogOut, RotateCcw, Zap } from 'lucide-react';
import { auth, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../lib/firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
    isQuotaError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    let isQuotaError = false;
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string | null;
      };
      const errText = parsed.error || error.message;
      if (errText.includes('Quota exceeded') || errText.includes('resource-exhausted')) {
        isQuotaError = true;
        readable =
          'Daily Firestore free-tier read/write quota exceeded. Free tier resets tomorrow, or you can instantly upgrade your project plan in the Firebase Console.';
      } else if (parsed.error) {
        const prefix = parsed.operationType ? `[${parsed.operationType}] ` : '';
        if (parsed.error.includes('Missing or insufficient permissions')) {
          readable = `${prefix}Firestore permission denied${parsed.path ? ` (${parsed.path})` : ''}. Try signing out and back in, or check your Firestore rules.`;
        } else if (parsed.error.includes('client is offline')) {
          readable = 'Could not reach Firestore. Check your internet connection or firewall/ad-blocker settings.';
        } else {
          readable = `${prefix}${parsed.error}`;
        }
      }
    } catch {
      if (error.message.includes('Quota exceeded') || error.message.includes('resource-exhausted')) {
        isQuotaError = true;
        readable =
          'Daily Firestore free-tier read/write quota exceeded. Free tier resets tomorrow, or you can instantly upgrade your project plan in the Firebase Console.';
      }
    }
    return {
      hasError: true,
      message: readable,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: '', isQuotaError: false });
    window.location.href = '/';
  };

  handleSignOutAndReset = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut failure
    }
    this.setState({ hasError: false, message: '', isQuotaError: false });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDF7]">
          <div className="max-w-md w-full bg-white border-2 border-slate-900 rounded-2xl p-8 shadow-[0_6px_0_0_#0F172A] text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl border-2 border-slate-900 bg-amber-300 flex items-center justify-center mx-auto shadow-[0_3px_0_0_#0F172A]">
              <Zap className="w-6 h-6 text-slate-900" />
            </div>

            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                {this.state.isQuotaError ? 'Firestore Quota Reached' : 'Something interrupted the match'}
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words">
                {this.state.message}
              </p>
            </div>

            {this.state.isQuotaError && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-2 border-slate-900 bg-blue-600 text-white text-sm font-bold shadow-[0_3px_0_0_#0F172A] hover:bg-blue-700 active:translate-y-[2px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" />
                Open Firebase Upgrade Console
              </a>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-amber-300 text-slate-900 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-amber-400 active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return to Lobby
              </button>
              <button
                type="button"
                onClick={() => void this.handleSignOutAndReset()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-slate-800 text-xs font-bold shadow-[0_2px_0_0_#0F172A] hover:bg-slate-50 active:translate-y-[1px] active:shadow-none transition-all cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
