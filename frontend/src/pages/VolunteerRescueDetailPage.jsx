import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getVolunteerRescue, respondToVolunteerRescue } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatSkills } from "../utils/format";

const RESPONSE_ACTIONS = [
  { label: "Accept", status: "accepted", className: "primary-button" },
  { label: "Decline", status: "declined", className: "danger-button" },
  { label: "On the way", status: "on_the_way", className: "secondary-button" },
  { label: "Completed", status: "completed", className: "secondary-button" },
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Volunteer View</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Assigned rescue #{rescue.id}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Review the rescue details, update your response state, and keep the coordinator informed through chat.
          </p>
        </div>
        <div className="flex gap-3">
          <Link className="secondary-button" to="/my-rescues">Back to my rescues</Link>
          <Link className="secondary-button" to={`/chat?rescueId=${rescue.id}`}>Open chat</Link>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <SectionCard description="The rescue details and dispatch context visible to the assigned volunteer." title="Rescue summary">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{rescue.location}</div>
                  <div className="mt-1">{rescue.animal_type || "Animal type not specified"} • urgency {rescue.urgency || "n/a"}</div>
                </div>
                <StatusBadge status={rescue.current_response_status || rescue.rescue_status} />
              </div>
              <div className="mt-4">Required skills: {formatSkills(rescue.required_skills)}</div>
              <div className="mt-2">Notes: {rescue.notes || "No notes added."}</div>
              <div className="mt-2">Coordinator message: {rescue.dispatch_message || "No dispatch message saved."}</div>
              <div className="mt-2">Assigned: {formatDateTime(rescue.assigned_at)}</div>
              <div className="mt-2">Last update: {formatDateTime(rescue.last_update_at)}</div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-800">Update my rescue status</div>
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

        <SectionCard description="Rescue-linked chat is available while the assignment remains active." title="Chat">
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
