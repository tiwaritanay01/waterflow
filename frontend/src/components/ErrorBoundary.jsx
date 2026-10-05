import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full min-h-[400px] bg-slate-900 text-white flex flex-col items-center justify-center p-6 rounded-xl border border-slate-700">
          <div className="max-w-md w-full bg-slate-800/90 rounded-xl border border-red-500/40 p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Operational View Exception Handled</h3>
            <p className="text-xs text-slate-400 mb-4">
              {this.state.error?.message || "An unexpected view error occurred."}
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recover View</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
