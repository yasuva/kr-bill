import React, { useState } from "react";
import { Lock, User, Terminal, Loader2 } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onToast: (text: string, type: "success" | "error") => void;
}

export default function AdminLogin({ onLoginSuccess, onToast }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      onToast("Please fill in all security fields.", "error");
      return;
    }

    setLoading(true);
    try {
      // Import apiService lazily
      const { apiService } = await import("../services/api");
      const result = await apiService.login(username, password);
      
      if (result.success && result.user) {
        onToast(`Welcome, ${result.user.name}! Access approved.`, "success");
        onLoginSuccess(result.user);
      } else {
        onToast(result.message || "Invalid credentials.", "error");
      }
    } catch (err: any) {
      onToast("Network timeout. Connecting offline mode.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-login-screen" className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4 border border-indigo-100 dark:border-indigo-900/30 shadow-inner">
            <Terminal size={28} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            KR <span className="text-indigo-600 dark:text-indigo-400">Store</span> POS
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Sign in to start cashier session
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Cashier Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User size={18} />
              </span>
              <input
                id="username-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Cashier Security Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Secure Endpoint
            </span>
            <span className="hover:underline cursor-pointer">Local Backup Active</span>
          </div>

          <button
            id="login-button"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl text-sm transition-all shadow-md focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing index in...
              </>
            ) : (
              "Sign In to POS Station"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Credentials: admin / password123
          </p>
        </div>
      </div>
    </div>
  );
}
