import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getVolunteerAlerts, getVolunteerMe, getVolunteerRescues } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { SkillTags, StatusBadge, UrgencyChip, getRequestCardClass } from "../components/StatusBadge";
import { formatDateTime } from "../utils/format";

export function VolunteerDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [rescues, setRescues] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [profileData, rescueData, alertData] = await Promise.all([
          getVolunteerMe(),
          getVolunteerRescues(),
          getVolunteerAlerts(),
        ]);

        if (!cancelled) {
          setProfile(profileData);
          setRescues(rescueData);
          setAlerts(alertData);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load volunteer dashboard.");
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

  const activeRescues = rescues.filter((item) => item.rescue_status === "dispatched");
  const acceptedRescues = rescues.filter((item) => item.current_response_status === "accepted" || item.current_response_status === "on_the_way");
  const completedRescues = rescues.filter((item) => item.current_response_status === "completed");

  return (
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Volunteer View</div>
          <h1 className="page-title">My assignment dashboard</h1>
          <p className="page-description">
            Review your current rescue assignments, respond to new dispatches, and stay in contact with the coordinator team.
          </p>
        </div>
        <div className="page-chip">
          Signed in as <strong>{profile?.volunteer?.name || profile?.user?.username || "Volunteer"}</strong>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="stat-grid">
        <StatCard label="Active Rescues" meta="Currently dispatched" tone="amber" value={activeRescues.length} />
        <StatCard label="Pending Alerts" meta="Awaiting your response" tone="red" value={alerts.length} />
        <StatCard label="In Progress" meta="Accepted or on the way" tone="teal" value={acceptedRescues.length} />
        <StatCard label="Completed" meta="Resolved by you" tone="blue" value={completedRescues.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          actions={<Link className="btn-outline" to="/my-rescues">Open My Rescues</Link>}
          description="These rescues are currently linked to your volunteer profile."
          title="Assigned rescues"
          titleTag="field queue"
        >
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading assigned rescues...</span>
              </div>
            </div>
          ) : rescues.length ? (
            <div className="space-y-3">
              {rescues.slice(0, 5).map((rescue) => (
                <article className={getRequestCardClass(rescue.current_response_status || rescue.rescue_status)} key={rescue.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[var(--text)]">{rescue.location}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
                        <UrgencyChip value={rescue.urgency || "N/A"} />
                      </div>
                    </div>
                    <div className="mono-copy">#{rescue.id}</div>
                  </div>
                  <div className="mt-3 text-sm text-[var(--text2)]">{rescue.animal_type || "Animal not specified"}</div>
                  <div className="mt-3">
                    <SkillTags skills={rescue.required_skills} />
                  </div>
                  <div className="mt-3 subdued-copy">Updated {formatDateTime(rescue.last_update_at)}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className="btn-outline" to={`/my-rescues/${rescue.id}`}>Open Rescue</Link>
                    <Link className="btn-outline" to={`/chat?rescueId=${rescue.id}`}>Open Chat</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No rescues are currently assigned to you.</div>
          )}
        </SectionCard>

        <SectionCard
          actions={<Link className="btn-outline" to="/chat">Open Chat</Link>}
          description="Dispatch alerts stay active until you accept or decline the assignment."
          title="Dispatch alerts"
          titleTag="priority"
        >
          {loading ? (
            <div className="loading-wrap">
              <div className="loading-state">
                <span className="pulse-dot" />
                <span>Loading assignment alerts...</span>
              </div>
            </div>
          ) : alerts.length ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <article className="request-card contacted" key={alert.rescue_request_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[var(--text)]">{alert.location}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={alert.current_response_status || "contacted"} />
                        <UrgencyChip value={alert.urgency || "N/A"} />
                      </div>
                    </div>
                    <div className="mono-copy">#{alert.rescue_request_id}</div>
                  </div>
                  <div className="mt-3 text-sm text-[var(--text2)]">{alert.animal_type || "Animal not specified"}</div>
                  <div className="notice notice-muted mt-3">
                    {alert.dispatch_message || "A coordinator assigned you to a new rescue."}
                  </div>
                  <div className="mt-3 subdued-copy">Assigned {formatDateTime(alert.created_at)}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No pending dispatch alerts right now.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
