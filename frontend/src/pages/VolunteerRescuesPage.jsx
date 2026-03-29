import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getVolunteerRescues } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatSkills } from "../utils/format";

export function VolunteerRescuesPage() {
  const [rescues, setRescues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRescues() {
      setLoading(true);
      setError("");

      try {
        const data = await getVolunteerRescues();
        if (!cancelled) {
          setRescues(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load assigned rescues.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRescues();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Volunteer View</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">My rescues</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Review only the rescues currently linked to your volunteer assignment history and open the ones that need action.
        </p>
      </div>

      <ErrorAlert message={error} />

      <SectionCard description="Each rescue includes your current response state and direct access to chat." title="Assigned rescue list">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading your rescues...</div>
        ) : rescues.length ? (
          <div className="space-y-4">
            {rescues.map((rescue) => (
              <article className="rounded-3xl border border-slate-200 bg-white p-5" key={rescue.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-950">{rescue.location}</h2>
                      <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {rescue.animal_type || "Animal not specified"} • urgency {rescue.urgency || "n/a"}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">Skills: {formatSkills(rescue.required_skills)}</div>
                    <div className="mt-2 text-sm text-slate-600">Coordinator message: {rescue.dispatch_message || "No dispatch message saved."}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      Assigned {formatDateTime(rescue.assigned_at)} • updated {formatDateTime(rescue.last_update_at)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link className="secondary-button" to={`/my-rescues/${rescue.id}`}>Open rescue</Link>
                    <Link className="secondary-button" to={`/chat?rescueId=${rescue.id}`}>Open chat</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
            You do not have any assigned rescues yet.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
