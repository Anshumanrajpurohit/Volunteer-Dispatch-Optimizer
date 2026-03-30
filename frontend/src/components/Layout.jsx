import { NavLink, Outlet } from "react-router-dom";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { VolunteerAlertCenter } from "./VolunteerAlertCenter";

const coordinatorNavigation = [
  { label: "Dashboard", to: "/" },
  { label: "Rescue Requests", to: "/rescue-requests" },
  { label: "Volunteers", to: "/volunteers" },
  { label: "Dispatch Logs", to: "/dispatch-logs" },
  { label: "Chat", to: "/chat" },
];

const volunteerNavigation = [
  { label: "Dashboard", to: "/" },
  { label: "My Rescues", to: "/my-rescues" },
  { label: "Chat", to: "/chat" },
  { label: "Profile", to: "/profile" },
];

export function Layout() {
  const { logout, user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isVolunteer = role === "volunteer";
  const navigation = isVolunteer ? volunteerNavigation : coordinatorNavigation;
  const eyebrow = isVolunteer ? "Volunteer Rescue Panel" : "Volunteer Rescue Console";
  const title = isVolunteer
    ? "Track your assignments and respond from the field."
    : "Coordinate rescue work without leaving the queue.";
  const description = isVolunteer
    ? "View only your assigned rescues, respond to dispatches, and chat with coordinators in real time."
    : "This frontend talks directly to the FastAPI backend at";

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="hero-surface">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="page-eyebrow text-white/70">{eyebrow}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-3 text-sm text-cyan-100/85">
                {description}
                {!isVolunteer ? (
                  <>
                    <span className="mx-1 font-medium text-white">{API_BASE_URL}</span>
                    with JWT-protected Axios requests and live operational views.
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                <div className="font-medium">{user?.username}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-100/70">{user?.role || "user"}</div>
              </div>
              <button className="hero-button" onClick={logout} type="button">
                Logout
              </button>
            </div>
          </div>
        </header>

        {isVolunteer ? <VolunteerAlertCenter /> : null}

        <nav className="panel-surface flex flex-wrap gap-2">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive
                  ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm"
                  : "rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
