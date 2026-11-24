import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed.error) {
        readable = `${parsed.operationType ? `[${parsed.operationType}] ` : ''}${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return {
      hasError: true,
      message: readable,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">Something interrupted the match</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Lobby
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
