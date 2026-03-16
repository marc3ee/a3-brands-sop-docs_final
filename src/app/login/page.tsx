"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const err = await login(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push("/sops");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--a3-bg)]">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold mt-4">Developer Documentation</h1>
          <p className="text-[var(--a3-text-muted)] text-sm mt-1">
            Standard Operating Procedures Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--a3-bg-secondary)] border border-[var(--a3-border)] rounded-xl p-8">
          <h2 className="text-lg font-semibold mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--a3-text-muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--a3-bg)] border border-[var(--a3-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-colors"
                placeholder="you@a3brands.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--a3-text-muted)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--a3-bg)] border border-[var(--a3-border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#4CAF50] focus:ring-1 focus:ring-[#4CAF50] transition-colors"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4CAF50] hover:bg-[#388E3C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Demo Credentials */}
          {/* <div className="mt-6 pt-6 border-t border-[var(--a3-border)]">
            <p className="text-xs text-[var(--a3-text-muted)] mb-3 font-medium uppercase tracking-wider">
              Demo Credentials
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[var(--a3-bg)] rounded-lg px-3 py-2">
                <div>
                  <span className="text-xs font-mono text-[#4CAF50]">Admin</span>
                  <span className="text-xs text-[var(--a3-text-muted)] ml-2">Full access</span>
                </div>
                <code className="text-xs text-[var(--a3-text-muted)]">admin@a3brands.com</code>
              </div>
              <div className="flex items-center justify-between bg-[var(--a3-bg)] rounded-lg px-3 py-2">
                <div>
                  <span className="text-xs font-mono text-blue-400">User</span>
                  <span className="text-xs text-[var(--a3-text-muted)] ml-2">Read-only</span>
                </div>
                <code className="text-xs text-[var(--a3-text-muted)]">dev@a3brands.com</code>
              </div>
            </div>
          </div> */}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--a3-text-muted)] mt-6">
          A3 Brands LLC &mdash; Automotive SEO Experts
        </p>
      </div>
    </div>
  );
}
