import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { VolunteerAlertCenter } from "./VolunteerAlertCenter";

const coordinatorNavigation = [
  { icon: "DB", label: "Dashboard", to: "/" },
  { icon: "RQ", label: "Rescue Requests", to: "/rescue-requests" },
  { icon: "VO", label: "Volunteers", to: "/volunteers" },
  { icon: "DL", label: "Dispatch Logs", to: "/dispatch-logs" },
  { icon: "CH", label: "Chat", to: "/chat" },
];

const volunteerNavigation = [
  { icon: "DB", label: "Dashboard", to: "/" },
  { icon: "MR", label: "My Rescues", to: "/my-rescues" },
  { icon: "CH", label: "Chat", to: "/chat" },
  { icon: "PR", label: "Profile", to: "/profile" },
];

function getInitials(value) {
  const parts = String(value || "RC")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "RC";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getCurrentSection(pathname, isVolunteer) {
  if (pathname === "/") {
    return "Dashboard";
  }

  if (pathname.startsWith("/rescue-requests/") && pathname.endsWith("/matches")) {
    return "Optimizer";
  }

  if (pathname.startsWith("/rescue-requests/")) {
    return "Rescue Detail";
  }

  if (pathname.startsWith("/my-rescues/") && pathname !== "/my-rescues") {
    return "My Rescue Detail";
  }

  if (pathname === "/rescue-requests") {
    return "Rescue Requests";
  }

  if (pathname === "/volunteers") {
    return "Volunteers";
  }

  if (pathname === "/dispatch-logs") {
    return "Dispatch Logs";
  }

  if (pathname === "/chat") {
    return "Rescue Chat";
  }

  if (pathname === "/my-rescues") {
    return "My Rescues";
  }

  if (pathname === "/profile") {
    return "Profile";
  }

  return isVolunteer ? "Volunteer Console" : "Mission Control";
}

export function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const role = String(user?.role || "").toLowerCase();
  const isVolunteer = role === "volunteer";
  const navigation = isVolunteer ? volunteerNavigation : coordinatorNavigation;
  const currentSection = getCurrentSection(location.pathname, isVolunteer);
  const breadcrumbRoot = isVolunteer ? "Volunteer Panel" : "Mission Control";
  const roleLabel = user?.role || "user";
  const userLabel = user?.username || "Responder";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">RC</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
              key={item.to}
              to={item.to}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-tooltip">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-role-badge">{roleLabel}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>{breadcrumbRoot}</span>
            <span>/</span>
            <span className="topbar-breadcrumb-current">{currentSection}</span>
          </div>
          <div className="topbar-spacer" />
          <div className="live-indicator">
            <span className="pulse-dot" />
            <span>Live</span>
          </div>
          <div className="user-chip">
            <div className="user-avatar">{getInitials(userLabel)}</div>
            <div>
              <div className="user-chip-name">{userLabel}</div>
              <div className="user-chip-role">{roleLabel}</div>
            </div>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            Logout
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {isVolunteer ? <VolunteerAlertCenter /> : null}

      <nav className="mobile-tabbar">
        {navigation.map((item) => (
          <NavLink
            className={({ isActive }) => `mobile-tabbar-item${isActive ? " active" : ""}`}
            key={item.to}
            to={item.to}
          >
            <span className="mobile-tabbar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
