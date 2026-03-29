import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDispatchLogs, getRescueRequests, getVolunteers } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatSkills } from "../utils/format";

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState({
    logs: [],
    requests: [],
    volunteers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [requests, volunteers, logs] = await Promise.all([
          getRescueRequests(),
          getVolunteers(),
          getDispatchLogs(),
        ]);

        if (!cancelled) {
          setDashboard({ logs, requests, volunteers });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const openRequests = dashboard.requests.filter((request) => (request.status || "").toLowerCase() === "open");
  const highUrgencyRequests = dashboard.requests.filter((request) => Number(request.urgency) >= 3);
  const activeVolunteers = dashboard.volunteers.filter((volunteer) => volunteer.active_status !== false);
  const recentLogs = dashboard.logs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Dispatch dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Monitor active requests, volunteer capacity, and recent outreach for
            <span className="mx-1 font-medium text-slate-900">{user?.username}</span>
            in one operational view.
          </p>
        </div>
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
          Role access:
          <span className="ml-2 font-medium text-slate-900">{user?.role || "unknown"}</span>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open requests" meta="Status currently open" tone="cyan" value={openRequests.length} />
        <StatCard label="High urgency" meta="Urgency 3 or 4" tone="amber" value={highUrgencyRequests.length} />
        <StatCard label="Active volunteers" meta="Assignable right now" tone="emerald" value={activeVolunteers.length} />
        <StatCard label="Dispatch logs" meta="Recorded outreach events" tone="slate" value={dashboard.logs.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard
          actions={
            <Link className="secondary-button" to="/rescue-requests">
              Open rescue requests
            </Link>
          }
          description="The latest requests from GET /rescue-requests."
          title="Queue snapshot"
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading rescue queue...</div>
          ) : (
            <div className="space-y-4">
              {dashboard.requests.slice(0, 5).map((request) => (
                <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{request.location}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {request.animal_type || "Animal type not specified"} • urgency {request.urgency || "n/a"}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="mt-3 text-sm text-slate-600">{formatSkills(request.required_skills)}</div>
                </article>
              ))}
              {!dashboard.requests.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No rescue requests are currently in the queue.
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard
          actions={
            <Link className="secondary-button" to="/dispatch-logs">
              Open dispatch logs
            </Link>
          }
          description="Recent outreach activity, including the volunteer and request attached to each dispatch."
          title="Recent dispatches"
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading dispatch history...</div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <article className="rounded-3xl border border-slate-200 bg-white p-4" key={log.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        {log.volunteer?.name || `Volunteer #${log.volunteer_id || "n/a"}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {log.rescue_request?.location || `Request #${log.rescue_request_id || "n/a"}`}
                      </div>
                    </div>
                    <StatusBadge status={log.dispatch_status} />
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">{formatDateTime(log.created_at)}</div>
                </article>
              ))}
              {!recentLogs.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  No dispatch logs recorded yet.
                </div>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
