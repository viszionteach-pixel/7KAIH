import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in React Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('kaih_smpn10_current_user_v1');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Tampilan Mengalami Kendala</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi mendeteksi adanya penyesuaian tampilan yang perlu diperbarui. Jangan khawatir, data presensi dan akun Anda tetap aman tersimpan di sistem.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/80 text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-28">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <button
                onClick={this.handleResetCache}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Sesi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
