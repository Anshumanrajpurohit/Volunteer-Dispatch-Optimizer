import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getVolunteerRescues } from "../api/endpoints";
import { ErrorAlert } from "../components/ErrorAlert";
import { SectionCard } from "../components/SectionCard";
import { SkillTags, StatusBadge, UrgencyChip, getRequestCardClass } from "../components/StatusBadge";
import { formatDateTime } from "../utils/format";

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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Volunteer View</div>
          <h1 className="page-title">My rescues</h1>
          <p className="page-description">
            Review only the rescues currently linked to your volunteer assignment history and open the ones that need action.
          </p>
        </div>
      </div>

      <ErrorAlert message={error} />

      <SectionCard description="Each rescue includes your current response state and direct access to chat." title="Assigned rescue list" titleTag="field queue">
        {loading ? (
          <div className="loading-wrap">
            <div className="loading-state">
              <span className="pulse-dot" />
              <span>Loading your rescues...</span>
            </div>
          </div>
        ) : rescues.length ? (
          <div className="space-y-3">
            {rescues.map((rescue) => (
              <article className={getRequestCardClass(rescue.current_response_status || rescue.rescue_status)} key={rescue.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--text)]">{rescue.location}</h2>
                      <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
                      <UrgencyChip value={rescue.urgency || "N/A"} />
                    </div>
                    <div className="mt-3 text-sm text-[var(--text2)]">{rescue.animal_type || "Animal not specified"}</div>
                    <div className="mt-3">
                      <SkillTags skills={rescue.required_skills} />
                    </div>
                    <div className="mt-3 text-[11px] text-[var(--text2)]">
                      Coordinator message: {rescue.dispatch_message || "No dispatch message saved."}
                    </div>
                    <div className="mt-3 table-meta">
                      Assigned {formatDateTime(rescue.assigned_at)} / updated {formatDateTime(rescue.last_update_at)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link className="btn-outline" to={`/my-rescues/${rescue.id}`}>Open Rescue</Link>
                    <Link className="btn-outline" to={`/chat?rescueId=${rescue.id}`}>Open Chat</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">You do not have any assigned rescues yet.</div>
        )}
      </SectionCard>
    </div>
  );
}
