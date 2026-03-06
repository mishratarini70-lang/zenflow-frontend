"use client";

import { useState } from "react";
import { supabase } from "@/Lib/supabase";
import { Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`, // Sends them back to the dashboard after login
      },
    });

    if (error) {
      console.error("Login failed:", error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/50 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-8 shadow-2xl z-10">
        
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/30">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Welcome to <span className="text-emerald-400">ZenFlow</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm text-center">
            Your AI-powered operating system for deep work and clarity.
          </p>
        </div>

        {/* Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full relative group flex items-center justify-center gap-3 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          ) : (
            <>
              {/* Custom Google G-Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-500">
            By continuing, you agree to ZenFlow's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
