import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { ErrorAlert } from "../components/ErrorAlert";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { initializing, isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    password: "",
    username: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/";

  if (!initializing && isAuthenticated) {
    return <Navigate replace to={destination} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form.username, form.password);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.userMessage || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.2),transparent_26%)]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/50 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur lg:grid-cols-[1.1fr,0.9fr]">
        <div className="hidden bg-[linear-gradient(135deg,#082f49_0%,#155e75_45%,#0f172a_100%)] p-10 text-white lg:block">
          <p className="page-eyebrow text-white/60">Volunteer Rescue Platform</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Field coordination with a calmer control room.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-cyan-100/85">
            Coordinators and volunteers sign in through the same secure auth flow backed by
            <span className="mx-1 font-medium text-white">POST /auth/login</span>
            and JWT-protected requests.
          </p>
          <div className="mt-10 space-y-4 text-sm text-cyan-100/80">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              Coordinators keep the existing rescue queue, optimizer, volunteer ranking, AI assist, and dispatch tools.
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
              Volunteers land in a limited panel with assignment alerts, rescue chat, and progress updates only.
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <p className="page-eyebrow">Sign In</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Access the rescue platform</h2>
          <p className="mt-3 text-sm text-slate-600">
            Use your existing coordinator, admin, or volunteer credentials. Routing after sign-in stays role-aware automatically.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-800">Username</span>
              <input
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                required
                value={form.username}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-800">Password</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={form.password}
              />
            </label>

            <ErrorAlert message={error} />

            <button className="primary-button w-full" disabled={submitting} type="submit">
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
