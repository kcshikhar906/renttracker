import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full space-y-6">
                        <div className="inline-flex p-4 rounded-2xl bg-danger/10 text-danger border border-danger/20 mb-4">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Something went wrong</h1>
                        <p className="text-slate-500 text-sm font-medium">The application encountered an unexpected error. This might be due to missing configuration or a network issue.</p>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left overflow-auto max-h-48">
                            <code className="text-xs text-danger font-mono">{this.state.error?.toString()}</code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand/20"
                        >
                            Refresh Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
