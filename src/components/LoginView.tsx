import { motion } from 'motion/react';
import { LogIn, Sparkles, Activity, Apple, Camera, Sun, Moon } from 'lucide-react';
import { signInWithGoogle } from '../lib/supabase';

interface LoginViewProps {
  onLoginSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function LoginView({ onLoginSuccess, isLoading, setIsLoading, theme, onToggleTheme }: LoginViewProps) {
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Supabase OAuth uses redirect — the auth state listener in App.tsx
      // will handle the session after Google redirects back.
    } catch (err) {
      console.error("Login failed:", err);
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300 relative">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onToggleTheme}
          className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition-all cursor-pointer shadow-xs hover:shadow-md"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <motion.div 
        id="login-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none p-8 text-center transition-colors duration-300"
      >
        {/* App Logo */}
        <div id="logo-badge" className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
          <Apple id="logo-icon" size={32} strokeWidth={2} />
        </div>

        {/* Brand Name */}
        <h1 id="app-title" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-2 font-sans">
          Calorie & Nutrition Tracker
        </h1>
        <p id="app-subtitle" className="text-slate-500 dark:text-slate-400 font-sans text-sm max-w-sm mx-auto mb-8">
          The minimalist way to scan your meals, track calories, break down ingredients, and hit your fitness milestones.
        </p>

        {/* Feature Highlights Grid */}
        <div id="feature-list" className="grid grid-cols-1 gap-4 text-left mb-8">
          <div id="feat-1" className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Camera size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Visual Snap Logging</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Take photos of breakfast, lunch, or dinner, and let AI estimate metrics instantly.</p>
            </div>
          </div>

          <div id="feat-2" className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Ingredients Breakdown</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Identify every constituent ingredient and estimate precise macro targets.</p>
            </div>
          </div>

          <div id="feat-3" className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Lean Progress Tracking</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Receive automated target calorie guidelines tailored to help you get lean.</p>
            </div>
          </div>
        </div>

        {/* Google Authentication Button */}
        <button
          id="google-signin-btn"
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full h-12 bg-slate-900 dark:bg-slate-850 text-white rounded-2xl flex items-center justify-center gap-2 font-medium hover:bg-slate-800 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent dark:border-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn id="signin-icon" size={18} />
              <span className="text-sm">Sign in with Google</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6 leading-normal">
          No sign up code needed. Securely synced to your personal private cloud database.
        </p>
      </motion.div>
    </div>
  );
}
