"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { useSOPs } from "@/contexts/SOPContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { refreshSOPs } = useSOPs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const err = await login(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      await refreshSOPs();
      router.push("/sops");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" variant={resolvedTheme === "dark" ? "dark" : "light"} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)] mt-4" style={{ fontFamily: 'var(--font-heading)' }}>Knowledge Base</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Sign in to access your documentation
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text-heading)] mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="you@a3brands.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-lg px-4 py-2.5 text-sm text-[var(--danger-text)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          A3 Brands LLC &mdash; Internal Knowledge Base
        </p>
      </div>
    </div>
  );
}
