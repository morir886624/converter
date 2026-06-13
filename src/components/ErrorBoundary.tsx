import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-2xl mb-3" aria-hidden>⚠</p>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Something went wrong</p>
          <p className="text-xs text-red-500 dark:text-red-500 mb-4 font-mono">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
