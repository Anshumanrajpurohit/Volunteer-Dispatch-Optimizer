import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getVolunteerRescue, respondToVolunteerRescue } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { SkillTags, StatusBadge, UrgencyChip } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime } from "../utils/format";

const RESPONSE_ACTIONS = [
  { label: "Accept", status: "accepted", className: "btn-primary" },
  { label: "Decline", status: "declined", className: "btn-danger" },
  { label: "On the Way", status: "on_the_way", className: "btn-outline" },
  { label: "Completed", status: "completed", className: "btn-outline" },
];

export function VolunteerRescueDetailPage() {
  const { rescueId } = useParams();
  const { user } = useAuth();
  const [rescue, setRescue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRescue() {
      setLoading(true);
      setError("");

      try {
        const data = await getVolunteerRescue(rescueId);
        if (!cancelled) {
          setRescue(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load assigned rescue.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRescue();
    return () => {
      cancelled = true;
    };
  }, [rescueId]);

  async function handleResponse(nextStatus) {
    setUpdating(true);
    setError("");

    try {
      const updated = await respondToVolunteerRescue(rescueId, { status: nextStatus });
      setRescue(updated);
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to update rescue response.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading assigned rescue..." />;
  }

  if (error && !rescue) {
    return <SectionCard title="Assigned rescue"><ErrorAlert message={error} /></SectionCard>;
  }

  return (
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Volunteer View</div>
          <h1 className="page-title">Assigned rescue #{rescue.id}</h1>
          <p className="page-description">
            Review the rescue details, update your response state, and keep the coordinator informed through chat.
          </p>
        </div>
        <div className="page-toolbar">
          <Link className="btn-outline" to="/my-rescues">Back to My Rescues</Link>
          <Link className="btn-outline" to={`/chat?rescueId=${rescue.id}`}>Open Chat</Link>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard description="The rescue details and dispatch context visible to the assigned volunteer." title="Rescue summary" titleTag="field brief">
          <div className="space-y-4 text-sm text-[var(--text2)]">
            <div className="selection-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--text)]">{rescue.location}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
                    <UrgencyChip value={rescue.urgency || "N/A"} />
                  </div>
                </div>
              </div>
              <div className="mt-3 muted-copy">{rescue.animal_type || "Animal type not specified"}</div>
              <div className="mt-3">
                <SkillTags skills={rescue.required_skills} />
              </div>
              <div className="mt-4 info-card">
                <div className="info-row">
                  <span className="info-label">Notes</span>
                  <span className="info-value">{rescue.notes || "No notes added."}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Coordinator message</span>
                  <span className="info-value">{rescue.dispatch_message || "No dispatch message saved."}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Assigned</span>
                  <span className="info-value">{formatDateTime(rescue.assigned_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last update</span>
                  <span className="info-value">{formatDateTime(rescue.last_update_at)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="mono-copy">Update my rescue status</div>
              <div className="flex flex-wrap gap-3">
                {RESPONSE_ACTIONS.map((action) => (
                  <button
                    className={action.className}
                    disabled={updating || rescue.current_response_status === action.status}
                    key={action.status}
                    onClick={() => handleResponse(action.status)}
                    type="button"
                  >
                    {updating && rescue.current_response_status !== action.status ? "Updating..." : action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard description="Rescue-linked chat is available while the assignment remains active." title="Chat" titleTag="live channel">
          <ChatPanel
            rescueRequestId={rescue.id}
            rescueStatus={rescue.rescue_status}
            userRole={user?.role}
            volunteerId={rescue.volunteer_id}
            volunteerName={rescue.volunteer_name}
          />
        </SectionCard>
      </div>
    </div>
  );
}
