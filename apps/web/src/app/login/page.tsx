"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Lock, Mail } from "lucide-react";

import { useAuth } from "../../components/auth/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { error, isLoading, login, user } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch {
      setLocalError("Invalid email or password.");
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">
            <Gauge size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">OJT LMS</p>
            <h1>Sign In</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                autoComplete="current-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </label>

          {(localError || error) && (
            <p className="form-error" role="alert">
              {localError ?? error}
            </p>
          )}

          <button className="command-button primary login-button" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
