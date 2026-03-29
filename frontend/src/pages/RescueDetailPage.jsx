import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getDispatchLogs, getRescueRequest, updateRescueRequestStatus } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatSkills, truncateText } from "../utils/format";

export function RescueDetailPage() {
  const { rescueId } = useParams();
  const { user } = useAuth();
  const [rescue, setRescue] = useState(null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [rescueData, logData] = await Promise.all([
          getRescueRequest(rescueId),
          getDispatchLogs({ rescue_request_id: rescueId }),
        ]);

        if (!cancelled) {
          setRescue(rescueData);
          setLogs(logData);
          setStatus(rescueData.status || "open");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.userMessage || "Unable to load rescue details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [rescueId]);

  const latestAssignment = useMemo(
    () => logs.find((log) => Boolean(log.volunteer_id)) || null,
    [logs],
  );
  const normalizedRescueStatus = String(rescue?.status || status || "open").toLowerCase();
  const hasActiveChat = Boolean(latestAssignment?.volunteer_id) && normalizedRescueStatus === "dispatched";

  async function handleStatusUpdate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const updated = await updateRescueRequestStatus(rescueId, { status });
      setRescue(updated);
      setStatus(updated.status || status);
    } catch (requestError) {
      setError(requestError.userMessage || "Unable to update rescue status.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading rescue detail..." />;
  }

  if (error && !rescue) {
    return <SectionCard title="Rescue detail"><ErrorAlert message={error} /></SectionCard>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-eyebrow">Rescue Detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Request #{rescue.id}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Inspect rescue context, review dispatch history, adjust status, and coordinate with the assigned volunteer when available.
          </p>
        </div>
        <div className="flex gap-3">
          <Link className="secondary-button" to="/rescue-requests">
            Back to queue
          </Link>
          <Link className="primary-button" to={`/rescue-requests/${rescue.id}/matches`}>
            Open optimizer
          </Link>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr] xl:items-start">
        <SectionCard description="Current rescue context and status management." title="Rescue summary">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{rescue.location}</div>
                  <div className="mt-1">{rescue.animal_type || "Animal type not specified"} • urgency {rescue.urgency || "n/a"}</div>
                </div>
                <StatusBadge status={rescue.status} />
              </div>
              <div className="mt-4">Required skills: {formatSkills(rescue.required_skills)}</div>
              <div className="mt-2">Notes: {rescue.notes || "No notes added."}</div>
              <div className="mt-2">Coordinates: {rescue.latitude}, {rescue.longitude}</div>
              <div className="mt-2">Created: {formatDateTime(rescue.created_at)}</div>
              <div className="mt-2">Last updated: {formatDateTime(rescue.updated_at)}</div>
            </div>

            <form className="space-y-4" onSubmit={handleStatusUpdate}>
              <FormField
                label="Request status"
                name="status"
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  { label: "open", value: "open" },
                  { label: "dispatched", value: "dispatched" },
                  { label: "resolved", value: "resolved" },
                  { label: "cancelled", value: "cancelled" },
                ]}
                type="select"
                value={status}
              />
              <button className="secondary-button w-full" disabled={saving} type="submit">
                {saving ? "Updating..." : "Update rescue status"}
              </button>
            </form>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            description={
              hasActiveChat
                ? "Live coordination thread for the currently assigned volunteer."
                : "Chat becomes available after volunteer assignment."
            }
            title="Rescue Chat"
          >
            <div className="space-y-4">
              <div className={`rounded-3xl border px-4 py-3 text-sm ${hasActiveChat ? "border-cyan-200 bg-cyan-50/70 text-cyan-900" : "border-slate-200 bg-slate-50/70 text-slate-600"}`}>
                {hasActiveChat ? (
                  <>
                    <div className="font-medium text-slate-950">Communication is active</div>
                    <div className="mt-1">
                      Linked to {latestAssignment?.volunteer?.name || `Volunteer #${latestAssignment?.volunteer_id}`} for the current dispatched rescue.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-slate-950">Communication is not active yet</div>
                    <div className="mt-1">Chat becomes available after volunteer assignment.</div>
                  </>
                )}
              </div>
              <div className="min-h-[24rem] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <ChatPanel
                  rescueRequestId={rescue.id}
                  rescueStatus={normalizedRescueStatus}
                  userRole={user?.role}
                  volunteerId={latestAssignment?.volunteer_id || null}
                  volunteerName={latestAssignment?.volunteer?.name || null}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard description="Dispatch events already recorded for this rescue request." title="Dispatch logs">
            <div className="space-y-4">
              {logs.map((log) => (
                <article className="rounded-3xl border border-slate-200 bg-white p-5" key={log.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-950">{log.volunteer?.name || `Volunteer #${log.volunteer_id}`}</h3>
                        <StatusBadge status={log.dispatch_status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{log.volunteer?.phone || "No phone"} • {log.volunteer?.email || "No email"}</p>
                    </div>
                    <div className="text-sm text-slate-500">{formatDateTime(log.created_at)}</div>
                  </div>
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {truncateText(log.message_snapshot || "No message snapshot", 5000)}
                  </div>
                  {log.notes ? <div className="mt-3 text-sm text-slate-600">Notes: {log.notes}</div> : null}
                </article>
              ))}
              {!logs.length ? (
                <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500">
                  No dispatch logs recorded yet for this request.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
