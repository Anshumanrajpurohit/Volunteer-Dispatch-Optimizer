import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getVolunteerAlerts, getVolunteerMe, getVolunteerRescues } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatSkills } from "../utils/format";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Volunteer View</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">My assignment dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Review your current rescue assignments, respond to new dispatches, and stay in contact with the coordinator team.
          </p>
        </div>
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
          Signed in as
          <span className="ml-2 font-medium text-slate-900">{profile?.volunteer?.name || profile?.user?.username || "Volunteer"}</span>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active rescues" meta="Currently dispatched" tone="cyan" value={activeRescues.length} />
        <StatCard label="Pending alerts" meta="Awaiting your response" tone="amber" value={alerts.length} />
        <StatCard label="In progress" meta="Accepted or on the way" tone="emerald" value={acceptedRescues.length} />
        <StatCard label="Completed" meta="Resolved by you" tone="slate" value={completedRescues.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <SectionCard
          actions={<Link className="secondary-button" to="/my-rescues">Open my rescues</Link>}
          description="These rescues are currently linked to your volunteer profile."
          title="Assigned rescues"
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading assigned rescues...</div>
          ) : rescues.length ? (
            <div className="space-y-4">
              {rescues.slice(0, 5).map((rescue) => (
                <article className="rounded-3xl border border-slate-200 bg-white p-5" key={rescue.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{rescue.location}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {rescue.animal_type || "Animal not specified"} • urgency {rescue.urgency || "n/a"}
                      </div>
                    </div>
                    <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
                  </div>
                  <div className="mt-3 text-sm text-slate-600">Skills: {formatSkills(rescue.required_skills)}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Updated {formatDateTime(rescue.last_update_at)}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className="secondary-button" to={`/my-rescues/${rescue.id}`}>Open rescue</Link>
                    <Link className="secondary-button" to={`/chat?rescueId=${rescue.id}`}>Open chat</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              No rescues are currently assigned to you.
            </div>
          )}
        </SectionCard>

        <SectionCard
          actions={<Link className="secondary-button" to="/chat">Open chat</Link>}
          description="Dispatch alerts stay active until you accept or decline the assignment."
          title="Dispatch alerts"
        >
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading assignment alerts...</div>
          ) : alerts.length ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <article className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5" key={alert.rescue_request_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{alert.location}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {alert.animal_type || "Animal not specified"} • urgency {alert.urgency || "n/a"}
                      </div>
                    </div>
                    <StatusBadge status={alert.current_response_status || "contacted"} />
                  </div>
                  <div className="mt-3 rounded-3xl bg-white/80 px-4 py-3 text-sm text-slate-700">
                    {alert.dispatch_message || "A coordinator assigned you to a new rescue."}
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">Assigned {formatDateTime(alert.created_at)}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
              No pending dispatch alerts right now.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
