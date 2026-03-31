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
    <div className="login-shell page-active">
      <div className="login-card">
        <div className="login-aside">
          <div className="page-kicker">Volunteer Rescue Platform</div>
          <h1 className="page-title">Field coordination with a calmer control room.</h1>
          <p className="page-description">
            Coordinators and volunteers sign in through the same secure auth flow backed by <strong>POST /auth/login</strong> and JWT-protected requests.
          </p>
          <div className="login-stack mt-10">
            <div className="selection-card">
              Coordinators keep the existing rescue queue, optimizer, volunteer ranking, AI assist, and dispatch tools.
            </div>
            <div className="selection-card">
              Volunteers land in a limited panel with assignment alerts, rescue chat, and progress updates only.
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="page-kicker">Sign In</div>
          <h2 className="page-title">Access the rescue platform</h2>
          <p className="page-description">
            Use your existing coordinator, admin, or volunteer credentials. Routing after sign-in stays role-aware automatically.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="form-field">
              <span className="form-label">Username</span>
              <input
                autoComplete="username"
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                required
                value={form.username}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={form.password}
              />
            </label>

            <ErrorAlert message={error} />

            <button className="btn-primary btn-full" disabled={submitting} type="submit">
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
