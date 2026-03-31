import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getDispatchLogs, getRescueRequest, updateRescueRequestStatus } from "../api/endpoints";
import { ChatPanel } from "../components/ChatPanel";
import { ErrorAlert } from "../components/ErrorAlert";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { SectionCard } from "../components/SectionCard";
import { SkillTags, StatusBadge, UrgencyChip, getStatusDotClass } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, truncateText } from "../utils/format";

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
    <div className="page-shell page-active">
      <div className="page-header">
        <div>
          <div className="page-kicker">Rescue Detail</div>
          <h1 className="page-title">Request #{rescue.id}</h1>
          <p className="page-description">
            Inspect rescue context, review dispatch history, adjust status, and coordinate with the assigned volunteer when available.
          </p>
        </div>
        <div className="page-toolbar">
          <Link className="btn-outline" to="/rescue-requests">
            Back to Queue
          </Link>
          <Link className="btn-primary" to={`/rescue-requests/${rescue.id}/matches`}>
            Open Optimizer
          </Link>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <SectionCard description="Current rescue context and status management." title="Rescue summary" titleTag="mission">
          <div className="space-y-4 text-sm text-[var(--text2)]">
            <div className="selection-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[var(--text)]">{rescue.location}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={rescue.status} />
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
                  <span className="info-label">Coordinates</span>
                  <span className="info-value">{rescue.latitude}, {rescue.longitude}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created</span>
                  <span className="info-value">{formatDateTime(rescue.created_at)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Last updated</span>
                  <span className="info-value">{formatDateTime(rescue.updated_at)}</span>
                </div>
              </div>
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
              <button className="btn-outline btn-full" disabled={saving} type="submit">
                {saving ? "Updating..." : "Update Rescue Status"}
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
            title="Rescue chat"
            titleTag="comms"
          >
            <div className="space-y-4">
              <div className={`notice ${hasActiveChat ? "notice-success" : "notice-muted"}`}>
                {hasActiveChat ? (
                  <>
                    <div className="font-semibold text-[var(--text)]">Communication is active</div>
                    <div className="mt-1">
                      Linked to {latestAssignment?.volunteer?.name || `Volunteer #${latestAssignment?.volunteer_id}`} for the current dispatched rescue.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-[var(--text)]">Communication is not active yet</div>
                    <div className="mt-1">Chat becomes available after volunteer assignment.</div>
                  </>
                )}
              </div>
              <ChatPanel
                rescueRequestId={rescue.id}
                rescueStatus={normalizedRescueStatus}
                userRole={user?.role}
                volunteerId={latestAssignment?.volunteer_id || null}
                volunteerName={latestAssignment?.volunteer?.name || null}
              />
            </div>
          </SectionCard>

          <SectionCard description="Dispatch events already recorded for this rescue request." title="Dispatch logs" titleTag="history">
            <div className="space-y-3">
              {logs.map((log) => (
                <article className="selection-card" key={log.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={getStatusDotClass(log.dispatch_status)} />
                        <h3 className="text-base font-semibold text-[var(--text)]">{log.volunteer?.name || `Volunteer #${log.volunteer_id}`}</h3>
                        <StatusBadge status={log.dispatch_status} />
                      </div>
                      <p className="mt-2 muted-copy">{log.volunteer?.phone || "No phone"} / {log.volunteer?.email || "No email"}</p>
                    </div>
                    <div className="table-meta">{formatDateTime(log.created_at)}</div>
                  </div>
                  <div className="notice notice-muted mt-4 whitespace-pre-wrap">
                    {truncateText(log.message_snapshot || "No message snapshot", 5000)}
                  </div>
                  {log.notes ? <div className="mt-3 subdued-copy">Notes: {log.notes}</div> : null}
                </article>
              ))}
              {!logs.length ? <div className="empty-state">No dispatch logs recorded yet for this request.</div> : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
