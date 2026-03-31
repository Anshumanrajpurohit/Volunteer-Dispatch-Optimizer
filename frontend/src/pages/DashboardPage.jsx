import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDispatchLogs, getRescueRequests, getVolunteers } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { SkillTags, StatusBadge, UrgencyChip, getRequestCardClass, getStatusDotClass } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime } from "../utils/format";

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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Overview</div>
          <h1 className="page-title">Dispatch dashboard</h1>
          <p className="page-description">
            Monitor active requests, volunteer capacity, and recent outreach for <strong>{user?.username}</strong> in one operational view.
          </p>
        </div>
        <div className="page-chip">
          Role access <strong>{user?.role || "unknown"}</strong>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="stat-grid">
        <StatCard label="Open Requests" meta="Queue currently open" tone="amber" value={openRequests.length} />
        <StatCard label="High Urgency" meta="Urgency 3 or 4" tone="red" value={highUrgencyRequests.length} />
        <StatCard label="Active Volunteers" meta="Assignable right now" tone="teal" value={activeVolunteers.length} />
        <StatCard label="Dispatch Logs" meta="Recorded outreach events" tone="blue" value={dashboard.logs.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          actions={
            <Link className="btn-outline" to="/rescue-requests">
              Open Rescue Requests
            </Link>
          }
          description="The latest requests from GET /rescue-requests."
          title="Queue snapshot"
          titleTag="live queue"
        >
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading rescue queue...</span>
              </div>
            </div>
          ) : dashboard.requests.length ? (
            <div className="space-y-3">
              {dashboard.requests.slice(0, 5).map((request) => (
                <article className={getRequestCardClass(request.status)} key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[var(--text)]">{request.location}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={request.status} />
                        <UrgencyChip value={request.urgency || "N/A"} />
                      </div>
                    </div>
                    <div className="mono-copy">#{request.id}</div>
                  </div>
                  <div className="mt-3 text-sm text-[var(--text2)]">{request.animal_type || "Animal type not specified"}</div>
                  <div className="mt-3">
                    <SkillTags skills={request.required_skills} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No rescue requests are currently in the queue.</div>
          )}
        </SectionCard>

        <SectionCard
          actions={
            <Link className="btn-outline" to="/dispatch-logs">
              Open Dispatch Logs
            </Link>
          }
          description="Recent outreach activity, including the volunteer and request attached to each dispatch."
          title="Recent dispatches"
          titleTag="audit feed"
        >
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading dispatch history...</span>
              </div>
            </div>
          ) : recentLogs.length ? (
            <div>
              {recentLogs.map((log) => (
                <article className="dispatch-row" key={log.id}>
                  <span className={getStatusDotClass(log.dispatch_status)} />
                  <div className="flex-1 min-w-0">
                    <div className="td-primary">{log.volunteer?.name || `Volunteer #${log.volunteer_id || "n/a"}`}</div>
                    <div className="muted-copy">{log.rescue_request?.location || `Request #${log.rescue_request_id || "n/a"}`}</div>
                    <div className="table-meta">{formatDateTime(log.created_at)}</div>
                  </div>
                  <StatusBadge status={log.dispatch_status} />
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No dispatch logs recorded yet.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

